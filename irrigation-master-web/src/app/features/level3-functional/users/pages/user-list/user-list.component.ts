import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { AppUser } from '../../../../../shared/models/user.model';
import { UserService } from '../../services/user.service';

interface ActiveFilterOption {
    label: string;
    value: boolean | null;
}

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [RouterModule, FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, SelectModule],
    templateUrl: './user-list.component.html'
})
export class UserListComponent {
    private userService = inject(UserService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly users = signal<AppUser[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly activeFilterOptions: ActiveFilterOption[] = [
        { label: 'Todos', value: null },
        { label: 'Activos', value: true },
        { label: 'Pendientes de aprobación', value: false }
    ];
    readonly activeFilter = signal<boolean | null>(null);

    private lastFirst = 0;
    private lastRows = 10;

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    onActiveFilterChange(): void {
        this.lastFirst = 0;
        this.fetch();
    }

    confirmDeactivate(user: AppUser): void {
        this.confirmationService.confirm({
            header: 'Confirmar desactivación',
            message: `¿Desactivar a "${user.fullName}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deactivate(user)
        });
    }

    activate(user: AppUser): void {
        this.userService.activate(user.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Usuario activado' : 'No se pudo activar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.userService.list(pageNumber, this.lastRows, this.activeFilter() ?? undefined).subscribe((result) => {
            this.loading.set(false);
            this.users.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private deactivate(user: AppUser): void {
        this.userService.delete(user.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Usuario desactivado' : 'No se pudo desactivar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
