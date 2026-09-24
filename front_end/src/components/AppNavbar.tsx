import { Badge, Container, Nav, Navbar } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import './AppNavbar.css'

type AppNavbarProps = {
  coins: number
}

export function AppNavbar({ coins }: AppNavbarProps) {
  return (
    <Navbar expand="lg" className="app-navbar" sticky="top">
      <Container fluid="xl">
        <Navbar.Brand as={NavLink} to="/game" className="brand-mark">
          <span className="brand-icon" aria-hidden="true">
            PF
          </span>
          <span>Pixel Farm</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navigation" />
        <Navbar.Collapse id="main-navigation">
          <Nav className="mx-auto nav-links">
            <Nav.Link as={NavLink} to="/game">
              Game
            </Nav.Link>
          </Nav>
          <div className="coin-balance">
            <span className="coin-dot" aria-hidden="true" />
            <span>{coins.toLocaleString('vi-VN')}</span>
            <Badge bg="warning" text="dark">
              COIN
            </Badge>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
