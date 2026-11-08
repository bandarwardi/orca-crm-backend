import { PartialType } from '@nestjs/swagger';
import { CreateWhatsappAccountDto } from './create-whatsapp-account.dto';

export class UpdateWhatsappAccountDto extends PartialType(CreateWhatsappAccountDto) {}
