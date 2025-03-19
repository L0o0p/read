import { IsString, Length, Matches, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

// src/auth/dto/login.dto.ts

export class LoginDto {
    @IsString()
    @Length(6, 6)
    @Matches(/^[A-Za-z0-9]{6}$/, {
        message: 'Code must be 6 characters of letters and numbers only'
    })
    code: string;
}

// src/auth/dto/create-user.dto.ts (仅供教师使用)
export class CreateUserDto {
    @IsString()
    @Length(6, 6)
    @Matches(/^[A-Za-z0-9]{6}$/)
    code: string;

    @IsString()
    @IsOptional()
    nickname?: string;

    @IsEnum(Role)
    @IsOptional()
    role?: Role = Role.STUDENT;
}

export class AuthResponseDto {
    accessToken: string;
    user: {
        id: string;
        username: string;
        email: string;
        role: Role;
        aiCredits: number;    // AI使用额度
        lastLoginAt: Date;
    };
}