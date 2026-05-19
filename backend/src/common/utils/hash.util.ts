import * as bcrypt from 'bcrypt';

export class HashUtil {
  static async hash(data: string, saltOrRounds: number = 10): Promise<string> {
    return bcrypt.hash(data, saltOrRounds);
  }

  static async compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
