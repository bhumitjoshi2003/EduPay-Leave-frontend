import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  templateUrl: './coming-soon.component.html',
  styleUrls: ['./coming-soon.component.css']
})
export class ComingSoonComponent {

  @Input() title: string = '🚧 Coming Soon';
  @Input() message: string = 'This feature is under development.';
  @Input() subMessage: string = 'We are working hard to bring it soon.';

}