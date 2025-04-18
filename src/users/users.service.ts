// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}

