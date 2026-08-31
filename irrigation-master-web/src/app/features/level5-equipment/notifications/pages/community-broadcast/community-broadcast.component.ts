import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { BroadcastAudience, NotificationService } from '../../services/notification.service';

// Espejo de ShowCommunityBroadcast en AdminMenuPage.xaml.cs de la App: incluye a Coordinador de
// Riego (backend: SendNotificationCommand solo exige el permiso SEND_NOTIFICATIONS, ya sembrado
// en ese rol) -- mismo conjunto que BROADCAST_ROLES en app.menu.ts, que gatea la entrada de menú.
const BROADCAST_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'VICEPRESIDENTE', 'COORDINADOR_RIEGO'];

interface AudienceOption {
    label: string;
    value: BroadcastAudience;
}

const WALKWAY_OPTION: AudienceOption = { label: 'Mi andador', value: 'Walkway' };
const ORGANIZATION_OPTION: AudienceOption = { label: 'Toda mi organización', value: 'Organization' };

// Gating a SUPERADMIN/Presidente/Vicepresidente/Coordinador de Riego, igual que en la App
// (AdminMenuPage). Espejo de CommunityBroadcastViewModel.LoadAsync: "Mi andador" solo aparece si
// el emisor tiene un andador asignado, "Toda mi organización" siempre está -- y la selección por
// defecto es la primera opción de la lista (igual que AudienceOptions.FirstOrDefault() en la App).
@Component({
    selector: 'app-community-broadcast',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, TextareaModule, MessageModule, SelectModule],
    templateUrl: './community-broadcast.component.html'
})
export class CommunityBroadcastComponent implements OnInit {
    private fb = inject(FormBuilder);
    private notificationService = inject(NotificationService);
    private currentSession = inject(CurrentSessionService);
    private userService = inject(UserService);
    private messageService = inject(MessageService);

    readonly canEdit = BROADCAST_ROLES.includes(this.currentSession.getRole() ?? '');

    readonly sending = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly audienceOptions = signal<AudienceOption[]>([ORGANIZATION_OPTION]);
    private walkwayId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        audience: this.fb.nonNullable.control<BroadcastAudience>('Organization'),
        message: ['', Validators.required]
    });

    constructor() {
        if (!this.canEdit) {
            this.form.disable();
        }
    }

    ngOnInit(): void {
        const userId = this.currentSession.getUserId();
        if (!this.canEdit || !userId) {
            return;
        }

        this.userService.getById(userId).subscribe((result) => {
            if (result.isSuccess && result.data?.walkwayId) {
                this.walkwayId = result.data.walkwayId;
                const options = [WALKWAY_OPTION, ORGANIZATION_OPTION];
                this.audienceOptions.set(options);
                this.form.controls.audience.setValue(options[0].value);
            }
        });
    }

    send(): void {
        if (!this.canEdit || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.sending.set(true);
        this.errorMessage.set(null);

        const { audience, message } = this.form.getRawValue();

        this.notificationService.send(message, audience, audience === 'Walkway' ? (this.walkwayId ?? undefined) : undefined).subscribe((result) => {
            this.sending.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: 'Aviso enviado', detail: this.recipientDetail(result.data) });
                this.form.patchValue({ message: '' });
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }

    cancel(): void {
        this.form.patchValue({ message: '' });
        this.errorMessage.set(null);
    }

    private recipientDetail(count: number | undefined): string {
        const n = count ?? 0;
        return n === 1 ? 'Enviado a 1 destinatario.' : `Enviado a ${n} destinatarios.`;
    }
}
