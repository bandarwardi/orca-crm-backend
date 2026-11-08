import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(tenantId: string, id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenant_id: tenantId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { tenant_id: tenantId } });
  }

  async create(tenantId: string, createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      ...createUserDto,
      password_hash,
      tenant_id: tenantId,
    });
    return this.usersRepository.save(user);
  }

  async updateUser(tenantId: string, id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(tenantId, id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async setActiveStatus(tenantId: string, id: string, is_active: boolean): Promise<User> {
    const user = await this.findById(tenantId, id);
    user.is_active = is_active;
    return this.usersRepository.save(user);
  }

  async deleteUser(tenantId: string, id: string): Promise<void> {
    const result = await this.usersRepository.delete({ id, tenant_id: tenantId });
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
