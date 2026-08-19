import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageModule } from 'primeng/message';

// Placeholder de andamiaje de navegación: la pantalla real de cada ruta se implementa en su
// propia fase. El título viene de `data.title` en app.routes.ts para no crear un componente
// por entrada de menú.
@Component({
    selector: 'app-coming-soon',
    standalone: true,
    imports: [MessageModule],
    templateUrl: './coming-soon.component.html'
})
export class ComingSoonComponent {
    private route = inject(ActivatedRoute);

    readonly title = this.route.snapshot.data['title'] ?? 'Próximamente';
}
