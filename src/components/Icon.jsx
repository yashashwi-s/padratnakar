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
    bookmarks: (
      <>
        <path d="M4 4h11v17l-5.5-3.5L4 21z" />
        <path d="M17 4h3v17l-2-1.3" />
      </>
    ),
    flower: (
      <>
        <path d="M12 12c-2.8-2.4-3.6-5-2.2-8.4 2.9 1 4.4 3.6 2.2 8.4Z" />
        <path d="M12 12c.8-3.6 2.8-5.4 6.4-5.5.2 3.1-1.9 5.3-6.4 5.5Z" />
        <path d="M12 12c3.5-1.3 6.2-.8 8.2 2.2-2.4 2-5.4 1.8-8.2-2.2Z" />
        <path d="M12 12c2.8 2.4 3.6 5 2.2 8.4-2.9-1-4.4-3.6-2.2-8.4Z" />
        <path d="M12 12c-.8 3.6-2.8 5.4-6.4 5.5-.2-3.1 1.9-5.3 6.4-5.5Z" />
        <path d="M12 12c-3.5 1.3-6.2.8-8.2-2.2 2.4-2 5.4-1.8 8.2 2.2Z" />
      </>
    ),
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
