import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { navItems } from "@/lib/navigation";
import content from "@/lib/content.json";

export default function SiteFooter() {
  return (
    <footer className="roastery-footer">
      <div className="footer-content">
        <div>
          <Link href="/" className="footer-wordmark">MELKORA</Link>
          <p>Ethiopian origins. Everyday rituals.<br />Coffee worth slowing down for.</p>
        </div>
        <div>
          <h3>TAKE A LOOK AROUND</h3>
          <nav aria-label="Footer navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/login">Team login ↗</Link>
          </nav>
        </div>
        <div>
          <h3>LETTERS FROM THE ROASTERY</h3>
          <p>Origin stories, coffee discoveries, and a little inspiration for your next cup.</p>
          <span className="newsletter-soon">Newsletter coming soon</span>
        </div>
      </div>
      <div className="footer-bottom">
        <p>{content.footer.copyright}</p>
        <Link href="/#cafes" className="inline-flex items-center gap-2">A good cup is just the beginning <ArrowUpRight size={13} /></Link>
      </div>
    </footer>
  );
}
