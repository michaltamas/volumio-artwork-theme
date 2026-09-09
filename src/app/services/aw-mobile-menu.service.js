/* Artwork phone layout: open/closed state of the menu sheet (the rail's replacement) */
class AwMobileMenuService {
  constructor() {
    'ngInject';
    this.open = false;
  }
  show() { this.open = true; }
  hide() { this.open = false; }
  toggle() { this.open = !this.open; }
}
export default AwMobileMenuService;
