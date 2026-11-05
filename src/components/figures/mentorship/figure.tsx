import { deskArt, folderArt, frontArt, travel } from "./geometry";
import { MentorshipFigureLive } from "./live";
import "@/components/iso/iso.css";
import "./figure.css";
export function MentorshipFigure() {
  return (
    <MentorshipFigureLive
      desk={deskArt}
      folder={folderArt}
      front={frontArt}
      travel={travel}
    />
  );
}
