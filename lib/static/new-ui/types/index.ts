export interface TreeViewItem<T> {
    data: T;
    children?: TreeViewItem<T>[];
}

export interface Point {
    x: number;
    y: number;
}
