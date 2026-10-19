import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'equipe@forum.castelmont.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'forum2026' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
