import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { Organization } from '../../../../../shared/models/organization.model';
import { Role } from '../../../../../shared/models/role.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { RoleService } from '../../../../level1-core/roles/services/role.service';
import { UserService } from '../../services/user.service';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, PasswordModule, SelectModule, MessageModule],
    templateUrl: './user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private organizationService = inject(OrganizationService);
    private roleService = inject(RoleService);
    private walkwayService = inject(WalkwayService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly isActive = signal(true);
    readonly currentRole = signal<string | null>(null);
    readonly currentWalkwayCode = signal<string | null>(null);

    readonly organizations = signal<Organization[]>([]);
    readonly roles = signal<Role[]>([]);
    readonly walkways = signal<Walkway[]>([]);

    private userId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        organizationId: ['', Validators.required],
        roleId: ['', Validators.required],
        password: ['', Validators.required],
        street: this.fb.control<string | null>(null),
        houseNumber: this.fb.control<number | null>(null, Validators.min(1))
    });

    readonly roleActionControl = this.fb.nonNullable.control('', Validators.required);
    readonly walkwayActionControl = this.fb.control<string | null>(null);
    readonly passwordActionControl = this.fb.nonNullable.control('', Validators.required);
    readonly confirmPasswordActionControl = this.fb.nonNullable.control('', Validators.required);
    readonly passwordMismatch = signal(false);
    readonly actionMessage = signal<string | null>(null);

    ngOnInit(): void {
        this.loadOrganizations();
        this.loadRoles();

        this.userId = this.route.snapshot.paramMap.get('id');
        if (this.userId) {
            this.isEditMode.set(true);
            this.form.controls.roleId.disable();
            this.form.controls.password.disable();
            this.loadUser(this.userId);
        }
    }

    // El desplegable "Andador actual" solo existe en modo edición -- sin esto, un SUPERADMIN vería
    // andadores de TODAS las organizaciones mezclados (sin indicar a cuál pertenece cada uno) y
    // podría elegir uno de una organización distinta a la del usuario, que AssignWalkwayCommand
    // rechaza correctamente ("No existe ningún registro de 'Pasarela'...").
    onOrganizationChange(organizationId: string): void {
        if (this.isEditMode() && organizationId) {
            this.loadWalkways(organizationId);
        }
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMessage.set(null);
        const value = this.form.getRawValue();

        const onResult = (result: { isSuccess: boolean; message: string }) => {
            this.saving.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Usuario actualizado' : 'Usuario creado', detail: result.message });
                this.router.navigate(['/users']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            this.userService
                .update(this.userId!, {
                    id: this.userId!,
                    firstName: value.firstName,
                    lastName: value.lastName,
                    email: value.email,
                    organizationId: value.organizationId,
                    street: value.street,
                    houseNumber: value.houseNumber
                })
                .subscribe(onResult);
        } else {
            this.userService.create(value).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/users']);
    }

    activateUser(): void {
        this.userService.activate(this.userId!).subscribe((result) => {
            this.notifyAction(result, 'Usuario activado', 'No se pudo activar');
            if (result.isSuccess) {
                this.isActive.set(true);
            }
        });
    }

    changeRole(): void {
        if (this.roleActionControl.invalid) {
            this.roleActionControl.markAsTouched();
            return;
        }

        this.userService.changeRole(this.userId!, this.roleActionControl.value).subscribe((result) => {
            this.notifyAction(result, 'Rol actualizado', 'No se pudo cambiar el rol');
            if (result.isSuccess) {
                const role = this.roles().find((r) => r.id === this.roleActionControl.value);
                this.currentRole.set(role?.name ?? this.currentRole());
            }
        });
    }

    assignWalkway(): void {
        this.userService.assignWalkway(this.userId!, this.walkwayActionControl.value).subscribe((result) => {
            this.notifyAction(result, 'Andador asignado', 'No se pudo asignar el andador');
            if (result.isSuccess) {
                const walkway = this.walkways().find((w) => w.id === this.walkwayActionControl.value);
                this.currentWalkwayCode.set(walkway?.code ?? null);
            }
        });
    }

    resetPassword(): void {
        this.passwordMismatch.set(false);

        if (this.passwordActionControl.invalid || this.confirmPasswordActionControl.invalid) {
            this.passwordActionControl.markAsTouched();
            this.confirmPasswordActionControl.markAsTouched();
            return;
        }

        // Validación local, sin red: mismo criterio que ResetPasswordAsync en
        // UserManagementViewModel de la App -- se comprueba al pulsar "Restablecer", no
        // mientras se escribe, y evita una petición innecesaria si no coinciden.
        if (this.passwordActionControl.value !== this.confirmPasswordActionControl.value) {
            this.passwordMismatch.set(true);
            return;
        }

        this.userService.resetPassword(this.userId!, this.passwordActionControl.value).subscribe((result) => {
            this.notifyAction(result, 'Contraseña restablecida', 'No se pudo restablecer la contraseña');
            if (result.isSuccess) {
                this.passwordActionControl.reset('');
                this.confirmPasswordActionControl.reset('');
            }
        });
    }

    private notifyAction(result: { isSuccess: boolean; message: string }, successSummary: string, errorSummary: string): void {
        this.messageService.add({
            severity: result.isSuccess ? 'success' : 'error',
            summary: result.isSuccess ? successSummary : errorSummary,
            detail: result.message
        });
    }

    // Las tres llamadas de abajo alimentan desplegables (Organización/Rol/Andador actual), no la
    // entidad principal de la pantalla -- antes, si alguna fallaba (p. ej. un permiso denegado), el
    // desplegable correspondiente quedaba vacío en silencio, indistinguible de "no hay registros".
    private loadOrganizations(): void {
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizations.set(result.items);
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadRoles(): void {
        this.roleService.list(1, 100).subscribe((result) => {
            this.roles.set(result.items);
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadWalkways(organizationId: string): void {
        this.walkwayService.list(1, 100, organizationId).subscribe((result) => {
            this.walkways.set(result.items);
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadUser(id: string): void {
        this.loading.set(true);
        this.userService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue(result.data);
                this.isActive.set(result.data.isActive);
                this.currentRole.set(result.data.role);
                this.currentWalkwayCode.set(result.data.walkwayCode ?? null);
                this.walkwayActionControl.setValue(result.data.walkwayId ?? null);
                this.loadWalkways(result.data.organizationId);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }
}
