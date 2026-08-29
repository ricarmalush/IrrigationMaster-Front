import { Component, inject, ViewEncapsulation } from '@angular/core'; // <-- Importa ViewEncapsulation
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../../services/auth';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RippleModule],
    templateUrl: './login.html',
    styleUrls: ['./login.scss'],
    encapsulation: ViewEncapsulation.None
})
export class Login {
    email = '';
    password = '';
    checked = false;

    private authService = inject(AuthService);
    private router = inject(Router);

    iniciarSesion() {
        if (!this.email || !this.password) {
            Swal.fire({
                title: 'Campos Incompletos',
                text: 'Por favor ingresa usuario y contraseña',
                icon: 'warning',
                confirmButtonColor: '#00bfa5'
            });
            return;
        }

        this.authService.login(this.email, this.password).subscribe((result) => {
            if (result.isSuccess) {
                this.router.navigate(['/']);
                return;
            }

            // 402 (sin licencia) y 403 (cuenta desactivada por un admin) no son fallos de
            // credenciales -- cada uno se distingue con su propio título/icono en vez del genérico
            // "Error de Autenticación".
            const title = result.isLicenceError ? 'Licencia no disponible' : result.isAccountDeactivatedError ? 'Cuenta desactivada' : 'Error de Autenticación';
            const icon = result.isLicenceError || result.isAccountDeactivatedError ? 'warning' : 'error';

            Swal.fire({
                title,
                text: result.message,
                icon,
                confirmButtonColor: '#00bfa5'
            });
        });
    }
}
