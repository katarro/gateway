enum Rol {
  Admin = 'ADMIN',
  Cliente = 'CLIENTE',
  Ejecutivo = 'EJECUTIVO',
}
export interface CurrentUser {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}
