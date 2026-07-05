/**
 * Bangladesh upazilas (thanas) grouped by district — powers the cascading
 * District → Upazila/Thana select so the second field auto-fills based on
 * the first, instead of making customers type a free-text area name.
 */
import type { BDDistrict } from "./bdDistricts";

export const BD_UPAZILAS: Record<BDDistrict, string[]> = {
  Dhaka: [
    "Dhanmondi", "Gulshan", "Banani", "Mirpur", "Mohammadpur", "Uttara", "Tejgaon",
    "Motijheel", "Ramna", "Badda", "Rampura", "Khilgaon", "Jatrabari", "Demra",
    "Kafrul", "Pallabi", "Adabor", "Hazaribagh", "Lalbagh", "Kotwali", "Sutrapur",
    "Wari", "Shahbagh", "New Market", "Cantonment", "Savar", "Dhamrai", "Dohar",
    "Keraniganj", "Nawabganj",
  ],
  Gazipur: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Tongi"],
  Narayanganj: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
  Cumilla: [
    "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Cumilla Sadar",
    "Daudkandi", "Debidwar", "Homna", "Laksam", "Meghna", "Monohorgonj", "Muradnagar",
    "Nangalkot", "Titas",
  ],
  Feni: ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
  Noakhali: [
    "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Noakhali Sadar", "Senbagh",
    "Sonaimuri", "Subarnachar",
  ],
  Bogura: [
    "Adamdighi", "Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo",
    "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala",
  ],
  Jessore: [
    "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur",
    "Jessore Sadar", "Manirampur", "Sharsha",
  ],
  "Cox's Bazar": [
    "Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Pekua", "Ramu",
    "Teknaf", "Ukhia",
  ],
  Dinajpur: [
    "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Dinajpur Sadar",
    "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur",
  ],
  Tangail: [
    "Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati",
    "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar",
  ],
  Faridpur: [
    "Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar",
    "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha",
  ],
  Kushtia: ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
  Pabna: [
    "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi",
    "Pabna Sadar", "Santhia", "Sujanagar",
  ],
  Sirajganj: [
    "Belkuchi", "Chauhali", "Kamarkhand", "Kazipur", "Raiganj", "Shahjadpur",
    "Sirajganj Sadar", "Tarash", "Ullapara",
  ],
  Brahmanbaria: [
    "Akhaura", "Ashuganj", "Bancharampur", "Brahmanbaria Sadar", "Kasba",
    "Nabinagar", "Nasirnagar", "Sarail",
  ],
  Habiganj: [
    "Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Habiganj Sadar",
    "Lakhai", "Madhabpur", "Nabiganj", "Shaistaganj",
  ],
  Moulvibazar: [
    "Barlekha", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Juri", "Rajnagar", "Sreemangal",
  ],
  Sunamganj: [
    "Bishwamvarpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar",
    "Jagannathpur", "Jamalganj", "Sullah", "Sunamganj Sadar", "Tahirpur", "Shantiganj",
  ],
  Natore: ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra"],
  Jamalpur: [
    "Baksiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj",
    "Melandaha", "Sarishabari",
  ],
  Sherpur: ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"],
  Naogaon: [
    "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadevpur", "Naogaon Sadar",
    "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar",
  ],
  Chapainawabganj: ["Bholahat", "Gomastapur", "Nachole", "Chapainawabganj Sadar", "Shibganj"],
  Lalmonirhat: ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
  Nilphamari: [
    "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Saidpur",
  ],
  Thakurgaon: ["Baliadangi", "Haripur", "Pirganj", "Ranisankail", "Thakurgaon Sadar"],
  Panchagarh: ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
  Kurigram: [
    "Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari",
    "Phulbari", "Rajarhat", "Raomari", "Ulipur",
  ],
  Gaibandha: [
    "Fulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur",
    "Saghata", "Sundarganj",
  ],
  Joypurhat: ["Akkelpur", "Joypurhat Sadar", "Kalai", "Khetlal", "Panchbibi"],
  Netrokona: [
    "Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Khaliajuri",
    "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala",
  ],
  Kishoreganj: [
    "Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj",
    "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail",
  ],
  Manikganj: [
    "Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair",
  ],
  Munshiganj: [
    "Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari",
  ],
  Narsingdi: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
  Rajbari: ["Baliakandi", "Goalandaghat", "Pangsha", "Kalukhali", "Rajbari Sadar"],
  Madaripur: ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"],
  Gopalganj: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  Shariatpur: ["Bhedarganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"],
  Magura: ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  Jhenaidah: [
    "Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa",
  ],
  Chuadanga: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
  Meherpur: ["Gangni", "Meherpur Sadar", "Mujibnagar"],
  Narail: ["Kalia", "Lohagara", "Narail Sadar"],
  Satkhira: [
    "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala",
  ],
  Bagerhat: [
    "Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla",
    "Morrelganj", "Rampal", "Sarankhola",
  ],
  Khagrachhari: [
    "Dighinala", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Manikchhari",
    "Matiranga", "Panchhari", "Ramgarh",
  ],
  Rangamati: [
    "Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Kaptai", "Kawkhali",
    "Langadu", "Naniarchar", "Rajasthali", "Rangamati Sadar",
  ],
  Bandarban: [
    "Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi",
  ],
  Patuakhali: [
    "Bauphal", "Dashmina", "Dumki", "Galachipa", "Kalapara", "Mirzaganj",
    "Patuakhali Sadar", "Rangabali",
  ],
  Bhola: [
    "Bhola Sadar", "Borhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan",
    "Manpura", "Tazumuddin",
  ],
  Barguna: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"],
  Jhalokati: ["Kathalia", "Jhalokati Sadar", "Nalchity", "Rajapur"],
  Pirojpur: [
    "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad (Swarupkathi)",
    "Pirojpur Sadar", "Zianagar",
  ],
  Lakshmipur: ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati"],
  Chandpur: [
    "Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua",
    "Matlab Dakshin", "Matlab Uttar", "Shahrasti",
  ],
  Sylhet: [
    "Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj",
    "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zakiganj",
    "Dakshin Surma",
  ],
  Chattogram: [
    "Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari",
    "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania",
    "Sitakunda", "Kotwali (Chattogram City)", "Panchlaish", "Double Mooring",
    "Pahartali", "Bayazid", "Bandar",
  ],
  Rajshahi: [
    "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba",
    "Puthia", "Tanore", "Rajshahi City",
  ],
  Khulna: [
    "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha",
    "Phultala", "Rupsa", "Terokhada", "Khulna City",
  ],
  Barishal: [
    "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Barishal Sadar",
    "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur",
  ],
  Rangpur: [
    "Badarganj", "Gangachara", "Kaunia", "Rangpur Sadar", "Mithapukur",
    "Pirgachha", "Pirganj", "Taraganj",
  ],
  Mymensingh: [
    "Bhaluka", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Haluaghat",
    "Ishwarganj", "Muktagachha", "Mymensingh Sadar", "Nandail", "Phulpur", "Trishal",
  ],
};

export function getUpazilasForDistrict(district: string): string[] {
  return BD_UPAZILAS[district as BDDistrict] ?? [];
}
