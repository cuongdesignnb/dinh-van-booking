import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(200)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(12, { message: 'Mật khẩu mới tối thiểu 12 ký tự' })
  @MaxLength(200)
  newPassword!: string;
}
