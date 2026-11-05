import './globals.css';

export const metadata = {
  title: 'Наши фильмы',
  description: 'Фильмы, которые мы посмотрели вместе',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#130f1d',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Unbounded:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
