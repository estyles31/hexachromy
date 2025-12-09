export default interface InspectContext<S> {
  id: string;
  title?: string;
  kind: string;
  data?: S;
}