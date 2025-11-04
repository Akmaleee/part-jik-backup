"use client"

import { describe } from "node:test"
import MomHeader from "./header-section"
import MomDescription from "./description-section"
import MomAttachmentSection from "./attachment-section"
// import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import MomFooter from "./footer-section"

// const styles = StyleSheet.create({
//   page: { fontFamily: "Helvetica", fontSize: 10, padding: 20, lineHeight: 1.5 },
//   section: { marginBottom: 10 },
// });

export default function MomDocumentLayout() {
    // return (
    //     <>
    //         {/* <MomHeader/> */}
    //         <MomDescription />
    //         <MomAttachmentSection />
    //     </>
    // )

    return (
    <div id="pdf-content">
      <div data-pdf-header>
        <MomHeader /> {/* your existing header */}
      </div>

      <div data-pdf-content>
        <MomDescription /> {/* main body */}
        <MomAttachmentSection /> {/* main body */}
      </div>

      <div data-pdf-footer>
        <MomFooter /> {/* your existing footer */}
      </div>
    </div>
  );

//     return (
//         <Document>
//             <Page size="A4" style={styles.page}>
//                 <MomHeader />
//                 <View style={styles.section}>
//                 <MomDescription />
//                 </View>
//                 <View style={styles.section}>
//                 <MomAttachmentSection />
//                 </View>
//                 <MomFooter />
//             </Page>
//         </Document>
//     );
}