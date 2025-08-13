import React from 'react';
import { ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header">
        <ShieldCheck size={40} className="privacy-icon" />
        <h1>Privacy Policy</h1>
        <p className="sub-heading">Effective date: July 25, 2025</p>
      </div>

      <div className="privacy-policy-content">
        <p><strong>NoctaZone</strong> ("us", "we", or "our") operates the <a href="https://www.noctazone.org">https://www.noctazone.org</a> website (the "Service").</p>

        <p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>

        <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

        <h2>Definitions</h2>
        <p><strong>Service:</strong> NoctaZone's website.</p>
        <p><strong>Personal Data:</strong> Identifiable information about a person.</p>
        <p><strong>Usage Data:</strong> Automatically collected data from the Service.</p>
        <p><strong>Cookies:</strong> Small data files stored on your device.</p>
        <p><strong>Data Controller:</strong> We are the controller of your Personal Data.</p>
        <p><strong>Data Processors:</strong> Third-party services processing data on our behalf.</p>
        <p><strong>Data Subject:</strong> You, the user of the Service.</p>

        <h2>Information Collection and Use</h2>
        <p>We collect different types of data to provide and improve our Service.</p>

        <h3>Types of Data Collected</h3>
        <p><strong>Personal Data:</strong> Name, email, phone, address, etc.</p>
        <p><strong>Usage Data:</strong> IP address, browser type, visit duration, etc.</p>
        <p><strong>Cookies:</strong> For preferences, security, and session tracking.</p>

        <h2>Use of Data</h2>
        <ul>
          <li>To provide and maintain our Service</li>
          <li>To notify you of changes</li>
          <li>To allow participation in features</li>
          <li>To provide support</li>
          <li>To gather valuable information</li>
          <li>To monitor and detect usage or issues</li>
          <li>To send offers or newsletters</li>
        </ul>

        <h2>Legal Basis for Processing Data (ODPC)</h2>
        <ul>
          <li>Contract performance</li>
          <li>With your permission</li>
          <li>Legitimate interest</li>
          <li>Payment processing</li>
          <li>Legal compliance</li>
        </ul>

        <h2>Retention, Transfer & Disclosure of Data</h2>
        <p>We retain data as needed for service and compliance. Data may be processed outside your country with safeguards.</p>

        <h2>Security</h2>
        <p>We use industry practices to protect your data, but no method is 100% secure.</p>

        <h2>Cookies & Tracking</h2>
        <p>You can disable cookies via your browser. Some functionality may be lost.</p>

        <h2>Your ODPC Rights</h2>
        <ul>
          <li>Access, update, delete your data</li>
          <li>Restrict or object to processing</li>
          <li>Data portability</li>
          <li>Withdraw consent</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>We use Google Analytics, Vercel, Supabase, and others. They may use cookies or collect data per their policies.</p>

        <h2>Payments</h2>
        <p>We do not store payment info. Transactions are handled by trusted third parties like M-Pesa.</p>

        <h2>Children's Privacy</h2>
        <p>We do not knowingly collect data from anyone under 18.</p>

        <h2>Changes</h2>
        <p>We may update this Privacy Policy. Review it periodically.</p>

        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:noctazone.customercare@gmail.com">noctazone.customercare@gmail.com</a></p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
