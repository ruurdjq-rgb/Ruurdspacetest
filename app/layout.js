import "./globals.css";

export const metadata = {
  title: "Sales Follow-up Dashboard",
  description: "Mijn dagelijkse follow-up taken",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
