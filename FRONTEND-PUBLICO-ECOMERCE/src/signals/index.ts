import { signal } from '@preact/signals';
import type { UsuarioSesion } from '../services/usuarioService';

export const clienteUser = signal<UsuarioSesion | null>(null);
export const authLoading = signal<boolean>(true);
export const isAuthenticated = signal<boolean>(false);

// Subscribe to update isAuthenticated easily
clienteUser.subscribe((user) => {
    isAuthenticated.value = !!user;
});
