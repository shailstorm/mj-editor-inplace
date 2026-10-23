import { Asset } from './Icon.jsx'

export default function Topbar({ toggleProjects, mobile = false, prompt, help }) {
  return (
    <header className="topbar">
      <button className="projects-button floating" aria-label="All Projects" onClick={toggleProjects}>
        <Asset name="LucideArrowLeft" />
        {!mobile && <span className="projects-label">All Projects</span>}
      </button>
      {prompt}
      {help}
    </header>
  )
}
