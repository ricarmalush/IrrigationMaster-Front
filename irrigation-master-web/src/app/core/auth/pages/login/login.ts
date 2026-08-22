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

            // 402 (GlobalMessages.NoActiveLicence): ni la organización ni el propio usuario tienen
            // licencia vigente -- no es un fallo de credenciales, así que se distingue con un icono
            // y título propios en vez del genérico "Error de Autenticación".
            Swal.fire({
                title: result.isLicenceError ? 'Licencia no disponible' : 'Error de Autenticación',
                text: result.message,
                icon: result.isLicenceError ? 'warning' : 'error',
                confirmButtonColor: '#00bfa5'
            });
        });
    }
}
