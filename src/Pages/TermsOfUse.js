import React from 'react';
import { ShieldCheck } from 'lucide-react';
import CustomNavbar from '../Components/CustomNavbar';

function TermsOfUse() {
  return (
    <>
      <CustomNavbar />
      <div className="terms-container">
        <div className="terms-header">
          <ShieldCheck size={40} />
          <h1>Terms of Use</h1>
          <p>Effective Date: August 1, 2025</p>
        </div>

        <section className="terms-section" id="acceptance">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using NoctaZone, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, please do not use our platform.
          </p>
        </section>

        <section className="terms-section" id="eligibility">
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and reside in a jurisdiction where skill-based gaming is legal. We reserve the right to request age verification.
          </p>
        </section>

        <section className="terms-section" id="account">
          <h2>3. Account Registration</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account information. All activities under your account are your responsibility.
          </p>
        </section>

        <section className="terms-section" id="skill-based">
          <h2>4. Skill-Based Gaming</h2>
          <p>
            NoctaZone hosts tournaments that are determined by skill, not chance. Outcomes are based on players’ performance, not random elements.
          </p>
        </section>

        <section className="terms-section" id="fees-payouts">
          <h2>5. Entry Fees & Payouts</h2>
          <p>
            Players may be required to pay an entry fee to participate. Winners will be awarded cash prizes as per our payout policies. All payouts are subject to verification.
          </p>
        </section>

        <section className="terms-section" id="prohibited">
          <h2>6. Prohibited Conduct</h2>
          <p>
            Users must not cheat, exploit bugs, or engage in any behavior that undermines fair competition. Violations may result in suspension or banning of accounts.
          </p>
        </section>

        <section className="terms-section" id="termination">
          <h2>7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at our sole discretion, especially in cases of suspected fraud or violations of these terms.
          </p>
        </section>

        <section className="terms-section" id="updates">
          <h2>8. Modifications to Terms</h2>
          <p>
            NoctaZone may update these Terms of Use at any time. Continued use of the platform signifies your acceptance of the revised terms.
          </p>
        </section>

        <section className="terms-section" id="disclaimer">
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            NoctaZone is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or that the platform is error-free.
          </p>
        </section>

        <section className="terms-section" id="limitation">
          <h2>10. Limitation of Liability</h2>
          <p>
            NoctaZone shall not be liable for any indirect or incidental damages arising out of the use or inability to use the platform.
          </p>
        </section>

        <section className="terms-section" id="governing">
          <h2>11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts located in Nairobi.
          </p>
        </section>

        <section className="terms-section" id="contact">
          <h2>12. Contact Us</h2>
          <p>
            For questions about these Terms, email us at <a href="mailto:noctazone.customercare@gmail.com">noctazone.customercare@gmail.com</a>.
          </p>
        </section>
      </div>
    </>
  );
}

export default TermsOfUse;

