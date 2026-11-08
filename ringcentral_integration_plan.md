# خطة تكامل RingCentral API — Orca CRM
> المصدر: [توثيق RingCentral للمطورين](https://developer.ringcentral.com) + [RingCentral Embeddable](https://github.com/ringcentral/ringcentral-embeddable)

---

## نظرة عامة على البنية

```
[عملاء الهاتف / SMS]
        ↕ مكالمات + رسائل
[RingCentral Platform]
        ↕ Webhook (POST) + REST API
[NestJS Backend — Orca]
        ↕ HTTP / WebSocket
[Angular Frontend — CRM Inbox]
        ↕ Embeddable Widget (إطار داخلي WebRTC)
[موظف المبيعات / الدعم]
```

---

## مقارنة سريعة: WhatsApp مقابل RingCentral

| الجانب | WhatsApp Cloud API | RingCentral |
|---|---|---|
| الغرض الأساسي | مراسلة العملاء (OTT) | مكالمات + SMS أمريكي |
| الرقم | رقم واتساب تجاري | رقم هاتف أمريكي فعلي |
| المكالمات الصوتية | لا يدعم | ✅ WebRTC + PSTN |
| SMS | ✅ نعم | ✅ نعم (SMS أمريكي) |
| المستهدف في CRM | التواصل مع المغتربين | الاتصال الهاتفي المحلي (US) |

---

## المرحلة الأولى: إنشاء التطبيق في RingCentral Developer Console

### 1.1 تسجيل التطبيق
1. اذهب إلى [RingCentral Developer Console](https://developer.ringcentral.com)
2. سجّل دخولك أو أنشئ حساباً جديداً (يمكن ربطه بحسابك التجاري)
3. اضغط **Create App** → اختر **REST API App**
4. اختر نوع التطبيق: **Browser-based app (for CRM integration)**

### 1.2 إعدادات التطبيق
| الحقل | القيمة |
|---|---|
| App Name | `Orca CRM Integration` |
| App Type | `Browser-based` |
| Platform Type | `Browser-based app` |
| Redirect URI | `https://api.orca-crm.com/ringcentral/callback` |
| App Permissions | `ReadAccounts`, `ReadMessages`, `EditMessages`, `SMS`, `RingOut`, `CallLog`, `Webhook`, `SubscriptionWebhook` |

### 1.3 جمع المعرّفات
| المعرّف | الوصف | مكان الحصول عليه |
|---|---|---|
| `RC_CLIENT_ID` | معرف التطبيق | App Settings → Credentials |
| `RC_CLIENT_SECRET` | سر التطبيق | App Settings → Credentials |
| `RC_SERVER_URL` | رابط الخادم | `https://platform.ringcentral.com` |
| `RC_ACCOUNT_ID` | معرف الحساب | غالباً `~` (يعني الحساب الحالي) |
| `RC_JWT_TOKEN` | توكن JWT للـ Server-to-Server | App Settings → Generate JWT |

> [!IMPORTANT]
> **للإنتاج**: استخدم **JWT Auth Flow** للبيانات الخلفية (Server-to-Server).
> **للـ Widget الأمامي**: استخدم **OAuth2 Authorization Code + PKCE**.
> لا تضع `RC_CLIENT_SECRET` في كود الـ Frontend أبداً.

---

## المرحلة الثانية: Backend (NestJS) — المصادقة والـ API

### 2.1 المتغيرات البيئية
```env
# .env
RC_CLIENT_ID=your_client_id
RC_CLIENT_SECRET=your_client_secret
RC_SERVER_URL=https://platform.ringcentral.com
RC_JWT_TOKEN=your_jwt_token          # للمصادقة Server-to-Server
RC_WEBHOOK_VERIFY_TOKEN=my_rc_secret_verify_token
```

### 2.2 تثبيت الحزمة الرسمية
```bash
npm install @ringcentral/sdk
```

### 2.3 RingCentral Service (NestJS)
```typescript
// ringcentral.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import SDK from '@ringcentral/sdk';

@Injectable()
export class RingCentralService implements OnModuleInit {
  private sdk: SDK;
  private platform: any;

  async onModuleInit() {
    this.sdk = new SDK({
      clientId: process.env.RC_CLIENT_ID,
      clientSecret: process.env.RC_CLIENT_SECRET,
      server: process.env.RC_SERVER_URL,
    });
    this.platform = this.sdk.platform();

    // مصادقة JWT (مرة واحدة عند بدء الخادم)
    await this.platform.login({ jwt: process.env.RC_JWT_TOKEN });
    console.log('RingCentral authenticated via JWT');
  }

  // إرسال SMS
  async sendSms(to: string, from: string, text: string): Promise<void> {
    await this.platform.post(
      '/restapi/v1.0/account/~/extension/~/sms',
      { from: { phoneNumber: from }, to: [{ phoneNumber: to }], text }
    );
  }

  // جلب سجل المكالمات
  async getCallLog(dateFrom: string, dateTo?: string): Promise<any[]> {
    const response = await this.platform.get(
      '/restapi/v1.0/account/~/extension/~/call-log',
      { dateFrom, dateTo, view: 'Detailed', perPage: 100 }
    );
    const data = await response.json();
    return data.records ?? [];
  }

  // جلب رسائل SMS من Message Store
  async getSmsMessages(dateFrom: string): Promise<any[]> {
    const response = await this.platform.get(
      '/restapi/v1.0/account/~/extension/~/message-store',
      { dateFrom, messageType: 'SMS', perPage: 100 }
    );
    const data = await response.json();
    return data.records ?? [];
  }

  // الاتصال RingOut (يتصل برقم الموظف أولاً ثم برقم العميل)
  async ringOut(fromNumber: string, toNumber: string): Promise<void> {
    await this.platform.post(
      '/restapi/v1.0/account/~/extension/~/ring-out',
      {
        from: { phoneNumber: fromNumber },
        to: { phoneNumber: toNumber },
        callerId: { phoneNumber: fromNumber },
        playPrompt: true,
      }
    );
  }

  // إنشاء Webhook Subscription
  async createWebhookSubscription(webhookUrl: string): Promise<void> {
    await this.platform.post('/restapi/v1.0/subscription', {
      eventFilters: [
        '/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS',
        '/restapi/v1.0/account/~/extension/~/telephony/sessions',
        '/restapi/v1.0/account/~/extension/~/presence?detailedTelephonyState=true',
      ],
      deliveryMode: {
        transportType: 'WebHook',
        address: webhookUrl,
        verificationToken: process.env.RC_WEBHOOK_VERIFY_TOKEN,
      },
      expiresIn: 604800, // 7 أيام بالثانية — يجب تجديده قبل الانتهاء
    });
  }
}
```

### 2.4 Webhook Controller (استقبال الأحداث)
```typescript
// ringcentral.controller.ts
@Controller('ringcentral')
export class RingCentralController {

  // ① التحقق من صحة الـ Webhook (Validation Handshake)
  @Post('webhook')
  async handleWebhook(
    @Headers('validation-token') validationToken: string,
    @Headers('verification-token') verificationToken: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // RingCentral يرسل Validation-Token عند أول اتصال — يجب إعادته فوراً
    if (validationToken) {
      return res.status(200).header('Validation-Token', validationToken).send();
    }

    // التحقق من صحة الـ Verification Token (أمان)
    if (verificationToken !== process.env.RC_WEBHOOK_VERIFY_TOKEN) {
      return res.status(403).send('Invalid verification token');
    }

    // معالجة الأحداث
    const event = body?.event;
    const body_data = body?.body;

    if (event?.includes('message-store')) {
      // رسالة SMS واردة جديدة
      await this.ringcentralService.handleIncomingSms(body_data);
    } else if (event?.includes('telephony/sessions')) {
      // حدث مكالمة (بدأت / انتهت / قيد الانتظار)
      await this.ringcentralService.handleCallSessionEvent(body_data);
    }

    // يجب الرد بـ 200 خلال 3 ثواني
    res.status(200).send('OK');
  }

  // ② OAuth2 Callback (للـ Frontend Widget)
  @Get('callback')
  async oauthCallback(@Query('code') code: string, @Res() res: Response) {
    // تبادل authorization code بـ access token
    const tokens = await this.ringcentralService.exchangeCodeForTokens(code);
    // حفظ الـ tokens وإعادة توجيه المستخدم
    res.redirect(`/inbox?rc_connected=true`);
  }
}
```

---

## المرحلة الثالثة: ضبط الـ Webhook في RingCentral Developer Console

### الخطوات:
1. في Developer Console → **My Apps → Your App → Webhooks**
2. أو استخدم الـ `createWebhookSubscription()` من الـ Service مباشرة
3. رابط الـ Webhook: `https://api.orca-crm.com/ringcentral/webhook`
4. فلاتر الأحداث المطلوبة:
   - ✅ `/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS` — رسائل SMS الجديدة
   - ✅ `/restapi/v1.0/account/~/extension/~/telephony/sessions` — أحداث المكالمات
   - ✅ `/restapi/v1.0/account/~/extension/~/presence` — حالة الموظف (متاح / مشغول)

> [!WARNING]
> **الـ Webhook Subscription تنتهي بعد 7 أيام!**
> يجب إنشاء **Cron Job في NestJS** يجدد الاشتراك كل 6 أيام تلقائياً.
> ```typescript
> @Cron('0 0 */6 * *') // كل 6 أيام
> async renewWebhookSubscription() {
>   await this.ringcentralService.renewSubscription();
> }
> ```

---

## المرحلة الرابعة: Frontend (Angular) — RingCentral Embeddable Widget

هذا هو الجزء الأقوى — RingCentral Embeddable يوفر **هاتف كامل داخل المتصفح** بدون تعقيد.

### 4.1 تسجيل Redirect URI في Developer Console
```
https://apps.ringcentral.com/integration/ringcentral-embeddable/latest/redirect.html
```
أضف هذا الرابط في **App Settings → OAuth Redirect URI**.

### 4.2 إضافة الـ Widget إلى Angular (`index.html`)
```html
<!-- src/index.html — داخل <body> في النهاية -->
<script>
  (function() {
    var rcs = document.createElement("script");
    rcs.src = "https://apps.ringcentral.com/integration/ringcentral-embeddable/latest/adapter.js"
              + "?clientId=YOUR_RC_CLIENT_ID"
              + "&redirectUri=https://apps.ringcentral.com/integration/ringcentral-embeddable/latest/redirect.html";
    var rcs0 = document.getElementsByTagName("script")[0];
    rcs0.parentNode.insertBefore(rcs, rcs0);
  })();
</script>
```

### 4.3 RingCentral Service في Angular
```typescript
// src/app/core/services/ringcentral.service.ts
import { Injectable } from '@angular/core';

declare const RCAdapter: any;

@Injectable({ providedIn: 'root' })
export class RingCentralWidgetService {

  // بدء مكالمة (Click-to-Dial) لرقم هاتف العميل
  dialNumber(phoneNumber: string): void {
    if (typeof RCAdapter !== 'undefined') {
      RCAdapter.clickToDial(phoneNumber);
    }
  }

  // الاستماع لأحداث المكالمات (انتهت المكالمة → تسجيل ملاحظة)
  onCallEnd(callback: (callData: RCCallEndEvent) => void): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'rc-call-end-notify') {
        callback(event.data.call);
      }
    });
  }

  // الاستماع لرسائل SMS الجديدة عبر Widget
  onNewSms(callback: (smsData: RCSmsEvent) => void): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'rc-message-updated-notify') {
        callback(event.data.message);
      }
    });
  }

  // إرسال SMS عبر الـ Widget
  sendSms(to: string, text: string): void {
    const iframe = document.querySelector('#rc-widget-adapter-frame') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'rc-adapter-new-sms',
        phoneNumber: to,
        conversation: { text },
      }, '*');
    }
  }
}

export interface RCCallEndEvent {
  id: string;
  direction: 'Inbound' | 'Outbound';
  from: { phoneNumber: string; name?: string };
  to: { phoneNumber: string; name?: string };
  duration: number;
  result: 'Accepted' | 'Missed' | 'Declined';
}

export interface RCSmsEvent {
  id: string;
  from: { phoneNumber: string };
  to: [{ phoneNumber: string }];
  subject: string;
  direction: 'Inbound' | 'Outbound';
  creationTime: string;
}
```

### 4.4 ربط Click-to-Dial في شاشة المحادثة
```typescript
// في inbox-conversation.component.ts
export class InboxConversationComponent {
  private rcWidget = inject(RingCentralWidgetService);
  private store = inject(InboxStore);

  callCustomer() {
    const conversation = this.store.activeConversation();
    if (conversation) {
      this.rcWidget.dialNumber(conversation.phone);
    }
  }

  ngOnInit() {
    // عند انتهاء مكالمة → أضف سجل تلقائياً في المحادثة
    this.rcWidget.onCallEnd((call) => {
      const duration = Math.floor(call.duration / 60) + 'د ' + (call.duration % 60) + 'ث';
      this.store.addSystemMessage({
        content: `📞 مكالمة ${call.direction === 'Outbound' ? 'صادرة' : 'واردة'} — المدة: ${duration} — النتيجة: ${call.result}`,
        channel: 'ringcentral',
      });
    });
  }
}
```

---

## المرحلة الخامسة: تحديث Inbox Store و Models

### 5.1 تحديث `inbox.models.ts` — إضافة نماذج RingCentral
```typescript
// إضافة إلى inbox.models.ts

export interface RingCentralCall {
  id: string;
  direction: 'Inbound' | 'Outbound';
  from: string;
  to: string;
  duration: number;          // بالثانية
  result: 'Accepted' | 'Missed' | 'Declined' | 'NoAnswer';
  startTime: string;         // ISO 8601
  recordingUrl?: string;     // رابط التسجيل الصوتي (إن وُجد)
}

// تحديث Message interface — إضافة حقول RingCentral
export interface Message {
  // ... الحقول الموجودة ...
  rcCallId?: string;         // معرف المكالمة في RingCentral
  rcCallDuration?: number;   // مدة المكالمة بالثانية
  rcCallResult?: string;     // نتيجة المكالمة
}
```

### 5.2 تحديث `inbox.store.ts` — إضافة RingCentral State
```typescript
// إضافة إلى InboxState
export interface InboxState {
  // ... الحقول الموجودة ...
  rcCallLog: RingCentralCall[];        // سجل المكالمات الأخيرة
  rcIsConnected: boolean;              // هل تم تسجيل الدخول للـ Widget؟
  rcActiveCall: RingCentralCall | null; // المكالمة النشطة حالياً
}

// في initialState:
rcCallLog: [],
rcIsConnected: false,
rcActiveCall: null,

// إضافة Methods:
withMethods((store, rcService = inject(RingCentralWidgetService)) => ({
  dialCustomer(phone: string) {
    rcService.dialNumber(phone);
  },
  setRcConnected(connected: boolean) {
    patchState(store, { rcIsConnected: connected });
  },
  addCallToLog(call: RingCentralCall) {
    patchState(store, { rcCallLog: [call, ...store.rcCallLog()] });
  },
}))
```

---

## المرحلة السادسة: Call Log Screen في CRM

### جلب سجل المكالمات عبر Backend
```
GET /api/ringcentral/call-log?dateFrom=2024-01-01
```

يعيد قائمة من المكالمات مع:
- رقم المتصل / المتلقي
- مدة المكالمة
- الوقت والتاريخ
- نتيجة المكالمة (مجاب / فائت / مرفوض)
- رابط التسجيل الصوتي (إن كان مفعّلاً في RingCentral)

---

## ملخص الملفات التي ستُنشأ/تُعدَّل

### Backend (NestJS):
```
src/
└── ringcentral/
    ├── ringcentral.module.ts
    ├── ringcentral.controller.ts    ← Webhook + OAuth Callback endpoints
    ├── ringcentral.service.ts       ← SMS + Call Log + Webhook Subscription
    ├── ringcentral.dto.ts           ← أنواع البيانات
    └── ringcentral.cron.service.ts  ← تجديد Webhook كل 6 أيام
```

### Frontend (Angular):
```
src/app/
├── core/services/
│   └── ringcentral.service.ts       ← Widget events + Click-to-Dial
└── features/inbox/
    ├── models/inbox.models.ts        ← إضافة RingCentralCall
    ├── store/inbox.store.ts          ← إضافة RC state + methods
    └── components/
        └── inbox-conversation/       ← زر الاتصال + سجل المكالمات
```

### `index.html`:
```
src/index.html                        ← إضافة RC Embeddable adapter script
```

---

## الخطوات الفورية التالية

| الأولوية | الخطوة | الزمن |
|---|---|---|
| 🔴 أولاً | إنشاء حساب RingCentral Developer + تسجيل التطبيق | يوم 1 |
| 🔴 أولاً | الحصول على Client ID + JWT Token | يوم 1 |
| 🟠 ثانياً | بناء `ringcentral.module.ts` في NestJS + مصادقة JWT | يوم 2 |
| 🟠 ثانياً | إضافة Embeddable Script في `index.html` | يوم 2 |
| 🟡 ثالثاً | ربط Click-to-Dial في شاشة المحادثة | يوم 3 |
| 🟡 ثالثاً | تفعيل Webhook + استقبال SMS | يوم 3-4 |
| 🟢 رابعاً | شاشة Call Log + ربط بالمحادثات | يوم 5 |
| 🟢 رابعاً | Cron Job لتجديد الـ Webhook كل 6 أيام | يوم 5 |

---

## قيود ومخاطر مهمة

| المخاطرة | التفاصيل |
|---|---|
| انتهاء Webhook | يجب تجديده كل 7 أيام — أتمتة هذا مطلوبة |
| حدود الـ Rate | 40 SMS/دقيقة لكل حساب |
| JWT Token | ينتهي ويحتاج تجديد دوري — سجّل في الـ logs |
| Production vs Sandbox | البيئة التجريبية محدودة — تأكد من استخدام بيانات الإنتاج |
| الامتيازات | يجب أن يكون لمستخدم JWT امتيازات كافية في حساب RingCentral |
