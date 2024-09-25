export interface TreeViewItem<T> {
    data: T;
    children?: TreeViewItem<T>[];
}
