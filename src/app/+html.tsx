import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML template for Expo Router Web.
 * Configures document title, language, and accessibility essentials.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Vybe - A cena da música autoral independente</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.title = "Vybe - A cena da música autoral independente";
              document.querySelectorAll('title').forEach(function(t) {
                if (!t.textContent.trim()) t.textContent = "Vybe - A cena da música autoral independente";
              });
              document.addEventListener('DOMContentLoaded', function() {
                document.title = "Vybe - A cena da música autoral independente";
                document.querySelectorAll('title').forEach(function(t) {
                  if (!t.textContent.trim()) t.textContent = "Vybe - A cena da música autoral independente";
                });
              });
              if (typeof MutationObserver !== 'undefined') {
                new MutationObserver(function() {
                  if (!document.title) document.title = "Vybe - A cena da música autoral independente";
                  document.querySelectorAll('title').forEach(function(t) {
                    if (!t.textContent.trim()) t.textContent = "Vybe - A cena da música autoral independente";
                  });
                }).observe(document.documentElement, { childList: true, subtree: true });
              }
            `,
          }}
        />
        {/* Reset styles for react-native-web ScrollView on web and set explicit dark background for accessibility checkers */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background-color: #0A0E16 !important;
                color: #F1F5F9;
              }
            `,
          }}
        />
      </head>
      <body style={{ backgroundColor: "#0A0E16", color: "#F1F5F9" }}>{children}</body>
    </html>
  );
}
