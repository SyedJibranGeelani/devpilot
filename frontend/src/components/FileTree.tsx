import { useState } from 'react';
import type { FileNode as FileNodeType } from '../types/analysis';
import styles from './FileTree.module.css';

interface NodeProps {
  node: FileNodeType;
  depth: number;
}

function Node({ node, depth }: NodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === 'directory';

  return (
    <li className={styles.item}>
      <button
        className={`${styles.row} ${isDir ? styles.dir : styles.file}`}
        style={{ paddingLeft: `${0.75 + depth * 1.125}rem` }}
        onClick={() => isDir && setOpen((o) => !o)}
        aria-expanded={isDir ? open : undefined}
      >
        <span className={styles.icon}>
          {isDir ? (open ? '📂' : '📁') : fileIcon(node.name)}
        </span>
        <span className={styles.name}>{node.name}</span>
      </button>
      {isDir && open && node.children.length > 0 && (
        <ul className={styles.list}>
          {node.children.map((child) => (
            <Node key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function fileIcon(name: string): string {
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '🔷';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return '🟨';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.json')) return '📋';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.css') || name.endsWith('.scss')) return '🎨';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return '⚙️';
  if (name === 'Dockerfile' || name === 'dockerfile') return '🐳';
  return '📄';
}

interface Props {
  node: FileNodeType;
}

export default function FileTree({ node }: Props) {
  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>File Tree</h3>
      <ul className={styles.list}>
        <Node node={node} depth={0} />
      </ul>
    </div>
  );
}
