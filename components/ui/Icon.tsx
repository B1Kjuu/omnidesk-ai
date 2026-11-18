const paths = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  book: "M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12.5H7.5A2.5 2.5 0 0 1 5 17zM17 7h2v12.5M8.5 8.5h5",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  inbox: "M4 13.5l2.5-8h11l2.5 8v5H4zM4 13.5h5l1 2h4l1-2h5",
  flag: "M6 21V4M6 4.5h11l-2 4 2 4H6",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  building: "M5 20.5V5l7-2v17.5M12 8h7v12.5M3.5 20.5h17M8 8.5v.01M8 12v.01M8 15.5v.01M15.5 12v.01M15.5 15.5v.01",
  external: "M14 5h5v5M19 5l-8 8M17 14v5H5V7h5",
  copy: "M8 8h11v11H8zM5 16V5h11",
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  chart: "M4 20h16M7 16v-4M12 16V7M17 16v-7",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
