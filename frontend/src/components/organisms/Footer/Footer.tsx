import React from "react";
import styles from "./Footer.module.css";

const FacebookIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);
const TwitterIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
  </svg>
);
const InstagramIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Link: React.FC<{
  href: string;
  className: string;
  children: React.ReactNode;
}> = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerContent}>
        <div className={styles.footerColumn}>
          <h3 className={styles.columnTitle}>Company</h3>
          <Link href="/about" className={styles.footerLink}>
            About Us
          </Link>
          <Link href="/careers" className={styles.footerLink}>
            Careers
          </Link>
          <Link href="/press" className={styles.footerLink}>
            Press
          </Link>
        </div>

        <div className={styles.footerColumn}>
          <h3 className={styles.columnTitle}>Help</h3>
          <Link href="/help-center" className={styles.footerLink}>
            Help Center
          </Link>
          <Link href="/contact" className={styles.footerLink}>
            Contact Us
          </Link>
          <Link href="/safety" className={styles.footerLink}>
            Safety Tips
          </Link>
        </div>

        <div className={styles.footerColumn}>
          <h3 className={styles.columnTitle}>Legal</h3>
          <Link href="/terms" className={styles.footerLink}>
            Terms of Service
          </Link>
          <Link href="/privacy" className={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link href="/cookies" className={styles.footerLink}>
            Cookie Policy
          </Link>
        </div>

        <div className={styles.footerColumn}>
          <h3 className={styles.columnTitle}>Follow Us</h3>
          <div className={styles.footerSocial}>
            <a
              href="[https://facebook.com](https://facebook.com)"
              className={styles.socialLink}
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
            <a
              href="[https://twitter.com](https://twitter.com)"
              className={styles.socialLink}
              aria-label="Twitter"
            >
              <TwitterIcon />
            </a>
            <a
              href="[https://instagram.com](https://instagram.com)"
              className={styles.socialLink}
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; {currentYear} Your Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
};
