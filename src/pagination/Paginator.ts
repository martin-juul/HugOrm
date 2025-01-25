export class Paginator<T> {
  constructor(
    public items: T[],
    public total: number,
    public perPage: number,
    public currentPage: number,
  ) {
  }

  get lastPage(): number {
    return Math.ceil(this.total / this.perPage);
  }

  hasMorePages(): boolean {
    return this.currentPage < this.lastPage;
  }
}
