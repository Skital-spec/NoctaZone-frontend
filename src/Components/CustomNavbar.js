import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const CustomNavbar = () => {
  return (
    <Navbar expand="md" bg="transparent" variant="dark" className="custom-navbar" >
      <Container>
        {/* Logo + Site Title */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img
            src="https://res.cloudinary.com/dm7edtofj/image/upload/v1754505778/logo_suleug.svg" 
            alt="Logo"
            width="40"
            height="40"
            style={{ filter: 'invert(1)' }}
            className="d-inline-block align-top me-2"
          />
          <h1 className="">NoctaZone</h1>
        </Navbar.Brand>
        {/* Hamburger Menu */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        {/* Collapsible Links */}
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav>
            <Nav.Link as={Link} to="/signup">
              <Button variant="outline-light" className="me-2">Sign Up</Button>
            </Nav.Link>
            <Nav.Link as={Link} to="/login">
              <Button variant="light">Login</Button>
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default CustomNavbar;
