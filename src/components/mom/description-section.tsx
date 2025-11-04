"use client";

export default function MomDescription() {
  return (
    <div className="w-[595px] text-[10pt] font-sans border border-black">
      <table className="w-full border-collapse">
        <tbody>
            {/* Attendees */}
          <tr className="">
            <td className="w-[20%] border border-black p-2 text-center align-middle">
              <p>Attendees</p>
            </td>

            {/* Value Attendees */}
            <td className="w-[80%] border border-black text-center p-2">
              <div className="font-bold text-[11pt]">MINUTE OF MEETING</div>
            </td>
          </tr>

            {/* Result Title */}
          <tr>
            <td colSpan={2} className="w-full border border-black font-bold text-center align-middle">
              <p className="text-[9pt]">Result</p>
            </td>
          </tr>

            {/* Description Title */}
          <tr>
            <td colSpan={2} className="w-full bg-gray-300 border border-black font-bold text-center align-middle">
              <p className="text-[9pt]">Description</p>
            </td>
          </tr>

          {/* Latar Belakang */}
          <tr className="">
            <td colSpan={2} className="border border-black p-2">
                <p className="font-bold">Latar Belakang</p>
                <ol className="ml-8 list-decimal">
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                </ol>
            </td>
          </tr>

          {/* Pembahasan */}
          <tr className="">
            <td colSpan={2} className="border border-black p-2">
                <p className="font-bold">Pembahasan</p>
                <ol className="ml-16 list-[lower-alpha]">
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                    <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
                </ol>
            </td>
          </tr>

          {/* Next Actions */}
          <tr className="">
            <td colSpan={2} className="border border-black p-2">
                <p className="font-bold">Next Action</p>
                <table className="w-full border-collapse border-black">
                    <thead>
                        <tr>
                            <td className="w-[6%] border border-black p-2 text-center align-center">
                                No
                            </td>
                            <td className="w-[40%] border border-black p-2 text-left align-center">
                                Action
                            </td>
                            <td className="w-[27%] border border-black p-2 text-left align-center">
                                Due Date
                            </td>
                            <td className="w-[27%] border border-black p-2 text-left align-center">
                                UIC
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border border-black text-center align-center">
                                1.
                            </td>
                            <td className="p-2 border border-black text-left align-center">
                                Seleksi terhadap 13 project initiative dengan fokus pada solusi yang siap digunakan (ready to use) dan berorientasi pada mission based
                            </td>
                            <td className="p-2 border border-black text-left align-center">
                                3 Oktober 2025
                            </td>
                            <td className="p-2 border border-black text-left align-center">
                                Telkomsat, LEN
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    )
}