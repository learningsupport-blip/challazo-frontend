import guidelinesImage from '../../assets/demo-video-guidelines.jpg'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import { modalAnalysisDetail } from '../ui/uiClasses'

const GUIDELINES_ALT = [
  'Guidelines to submit a demo video.',
  '1. Share your screen so we can see your project, code and working demo.',
  '2. Explain the problem statement, your solution, key features, the technology used and how it works.',
  '3. Keep the video concise and under 5 minutes.',
  '4. Once you have recorded and reviewed your video, submit it in the submission portal.',
  "Do share your screen with your project demo, clearly explain everything, and keep it under 5 minutes.",
  "Don't submit AI-generated videos, don't just show slides or a static presentation, and don't exceed 5 minutes.",
].join(' ')

/**
 * Shown every time a student starts a demo recording. The recording only
 * begins from "I understand", which is also the user click the browser needs
 * before it will open the screen-share picker.
 */
export default function DemoGuidelinesDialog({ open, onAccept, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Guidelines to submit a demo video"
      className={modalAnalysisDetail}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="accent" onClick={onAccept} leftIcon={<Icon name="check" size={17} />}>
            I understand, start recording
          </Button>
        </>
      }
    >
      <div className="stack-md">
        <p className="text-[14px] text-muted">
          Read these before you record. Your demo is reviewed against them.
        </p>
        <img
          src={guidelinesImage}
          alt={GUIDELINES_ALT}
          width={1774}
          height={887}
          className="h-auto w-full rounded-drop border border-hairline"
        />
      </div>
    </Modal>
  )
}
