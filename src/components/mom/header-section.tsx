"use client"

export default function MomHeader(){
    return (
        <div className="w-[595px] text-[10pt] font-sans border border-gray-500">
      <table className="w-full border-collapse">
        <tbody>
          <tr className="">
            {/* Logo kiri */}
            <td rowSpan={2} className="w-[25%] border border-gray-500 p-2 text-center align-middle" 
              style={{
                width: "25%",
                border: "1px solid gray",
                padding: "2px",
                textAlign: "center",
                verticalAlign: "middle",
              }}
            >
              <img
                src="http://127.0.0.1:9000/partnership/uploads/0c1eb943-0d46-48be-9304-5a36ac61159f-f9731302-f5c0-4bda-93d6-732ecd52ea67-telkomsatelitindonesia_logo.jpg"
                alt="Telkomsat Logo"
                className="mx-auto h-10 object-contain"
                style={{marginLeft: "auto", marginRight: "auto", height: "2.5rem", objectFit: "contain"}}
              />
            </td>

            {/* Judul tengah */}
            <td className="w-[50%] border border-gray-500 text-center p-2"
              style={{width:"50%", border: "1px solid gray", textAlign: "center", padding: "2px"}}
            >
              <div className="font-bold text-[11pt] uppercase"
                style={{
                  fontWeight: "bold",
                  fontSize: "11pt",
                  textTransform: "uppercase",
                }}
              >MINUTE OF MEETING</div>
              <div className="text-[9pt]" 
              style={{
                fontSize: "9pt",
              }}>
                Joint Planning Session 
                <span className="text-[#e53935] font-semibold" style={{
                  color: "#e53935",
                  fontWeight: 600, // font-semibold
                }}>Telkomsat</span> & LEN
              </div>
            </td>

            {/* Logo kanan */}
            <td rowSpan={2} className="w-[25%] border border-gray-500 p-2 text-center align-middle"
            style={{
              width: "25%",
              border: "1px solid #6b7280", // Tailwind gray-500 hex
              padding: "0.5rem",            // Tailwind p-2 ≈ 8px = 0.5rem
              textAlign: "center",
              verticalAlign: "middle",
            }}>
              <img
                src="http://127.0.0.1:9000/partnership/uploads/0c1eb943-0d46-48be-9304-5a36ac61159f-f9731302-f5c0-4bda-93d6-732ecd52ea67-telkomsatelitindonesia_logo.jpg"
                alt="Defend ID Logo"
                className="mx-auto h-10 object-contain"
                style={{marginLeft: "auto", marginRight: "auto", height: "2.5rem", objectFit: "contain"}}
              />
            </td>
          </tr>

          {/* Detail baris bawah */}
          <tr className="">
            <td colSpan={3} className="border border-gray-500 p-2"
            style={{
              border: "1px solid #6b7280",
              padding: "0.5rem",
            }}
            >
              <table className="w-full text-[9pt]"
              style={{
                width: "100%",
                fontSize: "9pt",
                borderCollapse: "collapse", // optional, mimics Tailwind table styling
              }}>
                <tbody>
                  <tr>
                    <td className="w-[60px] font-semibold" style={{
                      width: "60px",
                      fontWeight: 600,
                    }}>Date</td>
                    <td className="w-[10px] text-center"
                    style={{
                      width:"10px",
                      textAlign: "center"
                    }}>:</td>
                    <td>23 September 2025</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Time</td>
                    <td className="text-center">:</td>
                    <td>09.00 - 14.00</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Venue</td>
                    <td className="text-center">:</td>
                    <td>
                      RR 1B <span className="text-[#e53935] font-semibold">Telkomsat</span>
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