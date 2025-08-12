import React from 'react';
import { LifeBuoy } from 'lucide-react';

const SupportPage = () => {
  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-header">
        <LifeBuoy size={40} className="privacy-icon" />
        <h1>Support</h1>
        <p className="sub-heading">We're here to help</p>
      </div>

      <div className="privacy-policy-content text-center">
        <img 
          src= "https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg" 
          alt="NoctaZone Logo" 
          style={{ width: '100px', height: 'auto', marginBottom: '20px' ,filter: 'invert(1)'}} 
        />
        <h2>NoctaZone</h2>
        <p className="mt-3 lead">
          If you have any issues or questions, please email: <br />
          <a href="mailto:customercare@gamersaloon.com">customercare@noctazone.com</a>
        </p>
      </div>
    </div>
  );
};

export default SupportPage;

