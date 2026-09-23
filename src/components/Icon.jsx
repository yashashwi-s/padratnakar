export default function Icon({ name, ...props }) {
  const shapes = {
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    left: <path d="m14 5-7 7 7 7" />,
    right: <path d="m10 5 7 7-7 7" />,
    bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
    book: (
      <>
        <path d="M12 6v15M3 4c4 0 6 .5 9 2 3-1.5 5-2 9-2v15c-4 0-6 .5-9 2-3-1.5-5-2-9-2z" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: <path d="M5 12h14M12 5v14" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {shapes[name] || shapes.book}
    </svg>
  );
}
