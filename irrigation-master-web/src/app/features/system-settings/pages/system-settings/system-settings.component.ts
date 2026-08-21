import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { CurrentSessionService } from '../../../../core/services/current-session';
import { OrganizationService } from '../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../level3-functional/users/services/user.service';

// Solo SUPERADMIN tiene hoy el permiso MANAGE_ORGANIZATION_CODE sembrado (seed.json) -- ni
// Presidente ni VicePresidente lo tienen todavía, aunque el backend lo soportaría para ellos.
const REGENERATE_CODE_ROLES = ['SUPERADMIN'];

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmNewPassword = group.get('confirmNewPassword')?.value;
    return !confirmNewPassword || newPassword === confirmNewPassword ? null : { passwordMismatch: true };
}

@Component({
    selector: 'app-system-settings',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, MessageModule, PasswordModule],
    templateUrl: './system-settings.component.html'
})
export class SystemSettingsComponent implements OnInit {
    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private organizationService = inject(OrganizationService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly canRegenerateCode = REGENERATE_CODE_ROLES.includes(this.currentSession.getRole() ?? '');

    readonly organizationName = signal<string | null>(null);
    readonly invitationCode = signal<string | null>(null);
    readonly loadingOrganization = signal(false);
    readonly regenerating = signal(false);
    readonly organizationErrorMessage = signal<string | null>(null);

    readonly savingPassword = signal(false);
    readonly passwordErrorMessage = signal<string | null>(null);

    readonly passwordForm = this.fb.nonNullable.group(
        {
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmNewPassword: ['', Validators.required]
        },
        { validators: passwordsMatchValidator }
    );

    ngOnInit(): void {
        this.loadOrganization();
    }

    changePassword(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        this.savingPassword.set(true);
        this.passwordErrorMessage.set(null);
        const value = this.passwordForm.getRawValue();

        this.userService.changePassword(value).subscribe((result) => {
            this.savingPassword.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: 'Contraseña actualizada', detail: result.message });
                this.passwordForm.reset();
            } else {
                this.passwordErrorMessage.set(result.message);
            }
        });
    }

    confirmRegenerateCode(): void {
        if (!this.canRegenerateCode) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Confirmar regeneración',
            message: 'El código de invitación actual dejará de funcionar. ¿Regenerar el código?',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.regenerateCode()
        });
    }

    private regenerateCode(): void {
        const organizationId = this.currentSession.getOrganizationId();
        if (!organizationId) {
            return;
        }

        this.regenerating.set(true);
        this.organizationService.regenerateInvitationCode(organizationId).subscribe((result) => {
            this.regenerating.set(false);
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Código regenerado' : 'No se pudo regenerar',
                detail: result.message
            });
            if (result.isSuccess && result.data) {
                this.invitationCode.set(result.data);
            }
        });
    }

    private loadOrganization(): void {
        const organizationId = this.currentSession.getOrganizationId();
        if (!organizationId) {
            return;
        }

        this.loadingOrganization.set(true);
        this.organizationService.getById(organizationId).subscribe((result) => {
            this.loadingOrganization.set(false);
            if (result.isSuccess && result.data) {
                this.organizationName.set(result.data.name);
                this.invitationCode.set(result.data.invitationCode);
            } else {
                this.organizationErrorMessage.set(result.message);
            }
        });
    }
}
