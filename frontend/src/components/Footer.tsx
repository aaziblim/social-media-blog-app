import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} Chronicle. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/">Feed</Link>
          <Link to="/about">About</Link>
          <a href="https://github.com/aaziblim" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://linkedin.com/in/azizjibril" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
    </footer>
  )
}
