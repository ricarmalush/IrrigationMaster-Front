import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { NotificationService } from '../../services/notification.service';

// Sin gating de rol: visible a los 3 roles sin restricción, igual que en la App -- el backend
// resuelve el permiso (REPORT_INCIDENT, base de Vecino) y los destinatarios por su cuenta.
@Component({
    selector: 'app-report-incident',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, TextareaModule, MessageModule],
    templateUrl: './report-incident.component.html'
})
export class ReportIncidentComponent {
    private fb = inject(FormBuilder);
    private notificationService = inject(NotificationService);
    private messageService = inject(MessageService);

    readonly sending = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        message: ['', Validators.required]
    });

    send(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.sending.set(true);
        this.errorMessage.set(null);

        this.notificationService.reportIncident(this.form.getRawValue().message).subscribe((result) => {
            this.sending.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: 'Incidencia enviada', detail: this.recipientDetail(result.data) });
                this.form.reset();
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }

    cancel(): void {
        this.form.reset();
        this.errorMessage.set(null);
    }

    private recipientDetail(count: number | undefined): string {
        const n = count ?? 0;
        return n === 1 ? 'Enviada a 1 destinatario.' : `Enviada a ${n} destinatarios.`;
    }
}
