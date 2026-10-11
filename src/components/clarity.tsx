
import { Localized } from "@/components/localized";
import Script from "next/script";

const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
const validProjectId = clarityProjectId && /^[a-z0-9]+$/i.test(clarityProjectId) ? clarityProjectId : null;

export function Clarity() {
  if (!validProjectId) return null;

  return (
    <Localized><Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(validProjectId)});`}
    </Script></Localized>
  );
}
