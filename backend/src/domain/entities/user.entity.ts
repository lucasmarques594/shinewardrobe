export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  city?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  preferences?: {
    style?: string[];
    colors?: string[];
    brands?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
  city?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface UpdateUserDTO {
  name?: string;
  city?: string;
  gender?: 'male' | 'female' | 'other';
  preferences?: {
    style?: string[];
    colors?: string[];
    brands?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
  };
}