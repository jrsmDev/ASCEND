import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { backupFolder, chooseBackupFolder, resetBackupFolder, onBackupFolderChange } from '../lib/mobile.js'
import { useUI } from '../store/useUI.js'
import { Row } from './ui.jsx'

const DEFAULT_FOLDER_LABEL = 'Use default folder'

/* Where auto-backup puts its copies on this Android phone (#161): the existing default folder, or a
   chosen with the system picker — a sync app's, an SD card's. The choice is this phone's alone
   (lib/mobile.js), so it is read here and not from the synced state. When the chosen folder
   stops taking copies they go to the existing default folder again, and this says so until the
   folder is chosen again or the default is confirmed. */
export function useBackupFolder(enabled = true) {
  const [folder, setFolder] = useState(null)
  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    let off = () => {}
    try {
      backupFolder().then(f => { if (live) setFolder(f) }).catch(() => { if (live) setFolder({}) })
      off = onBackupFolderChange(f => { if (live) setFolder(f) })
    } catch (e) { setFolder({}) }
    return () => { live = false; off() }
  }, [enabled])
  return [folder, setFolder]
}

/* `keep` is AUTO_BACKUP_KEEP. The displayed default label avoids exposing the legacy storage path. */
export function autoBackupSubtitle(folder, keep) {
  if (folder?.uri && folder.label) return t('Saves a dated copy to “{0}” after finishing a workout or editing a routine, and keeps the newest {1}.', folder.label, keep)
  if (folder?.uri) return t('Saves a dated copy to the folder you chose after finishing a workout or editing a routine, and keeps the newest {0}.', keep)
  return t('Saves a dated copy to your default backup folder after finishing a workout or editing a routine, and keeps the newest {0}.', keep)
}

export default function BackupFolderRow() {
  const [folder, setFolder] = useBackupFolder()
  if (!folder) return null

  const choose = async () => {
    try {
      const next = await chooseBackupFolder()
      if (next) setFolder(next)
    } catch (e) { useUI.getState().toast(t('This folder can’t be used for backups.')) }
  }
  const useDefault = async () => { setFolder(await resetBackupFolder()) }

  return <>
    <Row icon="folder" iconTint="var(--blue)" title={t('Backup folder')}
      subtitle={folder.uri ? (folder.label || t('Chosen folder')) : t(DEFAULT_FOLDER_LABEL)} accessory="chevron" onClick={choose} />
    {folder.lost && <Row icon="warning" iconTint="var(--orange)" className="backup-lost"
      title={folder.lostLabel
        ? t('ASCEND can no longer write to “{0}”, so copies go to the default backup folder. Choose a folder again to switch back.', folder.lostLabel)
        : t('ASCEND can no longer write to the chosen folder, so copies go to the default backup folder. Choose a folder again to switch back.')} />}
    {(folder.uri || folder.lost) && <Row icon="reset" iconTint="var(--label-3)" title={t('Use default folder')}
      onClick={useDefault} />}
  </>
}
