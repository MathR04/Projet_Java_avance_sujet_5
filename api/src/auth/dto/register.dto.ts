import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** L'inscription d'un élève : les recruteurs et l'équipe ne s'inscrivent pas eux-mêmes. */
export class RegisterDto {
  @ApiProperty({ example: 'camille.martin@etu.castelmont.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Camille Martin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  // CHOIX : 8 caractères au moins, la seule règle. Pas d'exigence de
  // majuscules ou de chiffres : la longueur protège mieux.
  @ApiProperty({ example: 'motdepasse', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: [1, 2, 3], example: 2 })
  @IsIn([1, 2, 3])
  year!: number;
}
