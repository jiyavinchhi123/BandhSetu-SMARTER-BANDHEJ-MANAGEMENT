export type Language = 'en' | 'gu';

export interface Translations {
  [key: string]: {
    en: string;
    gu: string;
  };
}

export const translations: Translations = {
  // Brand & Common
  app_name: {
    en: 'BandhSetu',
    gu: 'બાંધસેતુ',
  },
  app_tagline: {
    en: 'Smarter Bandhej Management',
    gu: 'બાંધણી કારીગર વ્યવસ્થાપન',
  },
  dashboard: {
    en: 'Dashboard',
    gu: 'ડેશબોર્ડ',
  },
  artisan_workers: {
    en: 'Artisan Workers',
    gu: 'કારીગર બહેનો',
  },
  artisan_worker: {
    en: 'Artisan Worker',
    gu: 'કારીગર બહેન',
  },
  item_catalogue: {
    en: 'Item Catalogue',
    gu: 'ડિઝાઇન સૂચિ',
  },
  reports_analytics: {
    en: 'Reports & Analytics',
    gu: 'રિપોર્ટ્સ અને એનાલિટિક્સ',
  },
  manager_access: {
    en: 'Manager Access',
    gu: 'મેનેજર એક્સેસ',
  },
  settings: {
    en: 'Settings',
    gu: 'સેટિંગ્સ',
  },
  settings_title: {
    en: 'Settings',
    gu: 'સેટિંગ્સ',
  },
  credentials_update_title: {
    en: 'Login Credentials & Profile',
    gu: 'લૉગિન ઓળખપત્રો અને પ્રોફાઇલ',
  },
  credentials_update_subtitle: {
    en: 'Update Name, Mobile No, Email ID, and Password',
    gu: 'નામ, મોબાઇલ નંબર, ઇમેઇલ આઇડી અને પાસવર્ડ બદલો',
  },
  field_full_name: {
    en: 'Update Name (Full Name)',
    gu: 'નામ સુધારો (પૂરું નામ)',
  },
  field_mobile_no: {
    en: 'Mobile No',
    gu: 'મોબાઇલ નંબર',
  },
  field_email_id: {
    en: 'Email ID',
    gu: 'ઇમેઇલ આઇડી',
  },
  field_old_password: {
    en: 'Current (Old) Password',
    gu: 'વર્તમાન (જૂનો) પાસવર્ડ',
  },
  old_password_hint: {
    en: 'Required only when changing password',
    gu: 'ફક્ત પાસવર્ડ બદલતી વખતે જરૂરી',
  },
  field_new_password: {
    en: 'New Password',
    gu: 'નવો પાસવર્ડ',
  },
  field_confirm_password: {
    en: 'Confirm New Password',
    gu: 'પાસવર્ડ ફરીથી લખો',
  },
  password_hint: {
    en: 'Leave password blank if you do not want to change it.',
    gu: 'જો પાસવર્ડ ન બદલવો હોય તો આ ખાનું ખાલી રાખો.',
  },
  save_credentials_btn: {
    en: 'Update Login Credentials',
    gu: 'લૉગિન ઓળખપત્રો સાચવો',
  },
  register_manager_title: {
    en: 'Manager Registration',
    gu: 'મેનેજર નોંધણી (રજીસ્ટ્રેશન)',
  },
  register_manager_desc: {
    en: 'Register as an authorized manager. Requires Admin approval before first login.',
    gu: 'વર્કશોપ મેનેજર તરીકે નોંધણી કરો. લૉગિન કરવા માટે એડમિનની મંજૂરી જરૂરી છે.',
  },
  dont_have_account: {
    en: "Don't have an account? Register as Manager",
    gu: 'ખાતું નથી? મેનેજર તરીકે રજીસ્ટ્રેશન કરો',
  },
  already_have_account: {
    en: 'Already have an account? Sign In',
    gu: 'પહેલેથી એકાઉન્ટ છે? લૉગિન કરો',
  },
  approval_notice: {
    en: 'Manager accounts can access the workshop only after Admin approval.',
    gu: 'એડમિન દ્વારા મંજૂર થયા પછી જ મેનેજર એકાઉન્ટ વડે લૉગિન કરી શકાશે.',
  },
  registration_success_msg: {
    en: 'Registration submitted! Your account is pending Admin approval.',
    gu: 'રજીસ્ટ્રેશન સબમિટ થયું! તમારું એકાઉન્ટ એડમિનની મંજૂરી માટે બાકી છે.',
  },
  approve_manager_btn: {
    en: 'Approve Manager',
    gu: 'મંજૂર કરો',
  },
  decline_manager_btn: {
    en: 'Decline',
    gu: 'અસ્વીકાર',
  },
  pending_approval_badge: {
    en: 'PENDING APPROVAL',
    gu: 'મંજૂરી બાકી',
  },
  approved_success_msg: {
    en: 'Manager approved successfully! They can now log in.',
    gu: 'મેનેજર સફળતાપૂર્વક મંજૂર થયા! હવે તેઓ લૉગિન કરી શકશે.',
  },
  business_localization_title: {
    en: 'Business & Regional Localization',
    gu: 'વ્યવસાય અને પ્રાદેશિક સેટિંગ્સ',
  },
  business_name: {
    en: 'Business Name',
    gu: 'વ્યવસાયનું નામ',
  },
  default_currency: {
    en: 'Default Currency',
    gu: 'ચલણ',
  },
  timezone_label: {
    en: 'Timezone',
    gu: 'સમય ક્ષેત્ર (ટાઈમઝોન)',
  },
  allowed_wastage: {
    en: 'Allowed Fabric Wastage (%)',
    gu: 'કાપડ બગાડ મર્યાદા (%)',
  },
  save_preferences_btn: {
    en: 'Save Preferences',
    gu: 'પસંદગી સાચવો',
  },
  sign_out: {
    en: 'Sign Out',
    gu: 'લોગ આઉટ',
  },
  operations_menu: {
    en: 'Operations Menu',
    gu: 'મુખ્ય મેનુ',
  },

  // Language Modal
  choose_language_title: {
    en: 'Choose Preferred Language',
    gu: 'તમારી પસંદગીની ભાષા પસંદ કરો',
  },
  choose_language_desc: {
    en: 'Select the language you want to use in BandhSetu. You can change this anytime from the top bar.',
    gu: 'બાંધસેતુ વાપરવા માટે તમારી ભાષા પસંદ કરો. તમે ઉપરથી ગમે ત્યારે બદલી શકો છો.',
  },
  english: {
    en: 'English',
    gu: 'English (અંગ્રેજી)',
  },
  gujarati: {
    en: 'ગુજરાતી',
    gu: 'ગુજરાતી (Gujarati)',
  },
  continue: {
    en: 'Continue',
    gu: 'આગળ વધો',
  },

  // Dashboard
  register_artisan: {
    en: 'Register Artisan',
    gu: 'કારીગર નોંધણી',
  },
  total_artisans: {
    en: 'Total Artisans',
    gu: 'કુલ કારીગરો',
  },
  active_registered: {
    en: 'Active',
    gu: 'સક્રિય',
  },
  total_registered: {
    en: 'Total registered',
    gu: 'કુલ નોંધાયેલ',
  },
  pieces_given: {
    en: 'Pieces Given',
    gu: 'આપેલ પીસ',
  },
  pieces_given_desc: {
    en: 'Total distributed to artisans',
    gu: 'કારીગરોને આપેલ કુલ પીસ',
  },
  pieces_received: {
    en: 'Pieces Received',
    gu: 'જમા મળેલ પીસ',
  },
  pieces_received_desc: {
    en: 'Total accepted returns',
    gu: 'કારીગરો પાસેથી મળેલ પીસ',
  },
  remaining_pending: {
    en: 'Remaining Pending',
    gu: 'બાકી રહેલ પીસ',
  },
  still_with_artisans: {
    en: 'Still with artisans • View report',
    gu: 'કારીગરો પાસે બાકી • રિપોર્ટ જુઓ',
  },
  artisan_card_desc: {
    en: 'Manage artisan profiles, issue piece consignments, and record returns.',
    gu: 'કારીગરોનું ખાતું, માલ આપવો અને જમા લેવાનું મેનેજ કરો.',
  },
  catalogue_card_desc: {
    en: 'View and manage Bandhej designs, knot styles (Sarkam / Choot), and piece rates.',
    gu: 'બાંધણીની ડિઝાઇનો, કામનો પ્રકાર (સરકમ / છૂટ) અને ભાવ નક્કી કરો.',
  },
  reports_card_desc: {
    en: 'Track unreturned work by original issue date, view pending pieces, and export reports.',
    gu: 'તારીખ પ્રમાણે બાકી પીસ રિપોર્ટ જુઓ અને એક્સેલ ડાઉનલોડ કરો.',
  },

  // Reports
  live_outstanding: {
    en: 'Live Outstanding',
    gu: 'ચાલુ બાકી હિસાબ',
  },
  artisans_with_pending_work: {
    en: 'Artisans with Pending Work',
    gu: 'કામ બાકી હોય તેવા કારીગરો',
  },
  total_remaining_pieces: {
    en: 'Total Remaining Pieces',
    gu: 'કુલ બાકી પીસ',
  },
  from_issue_date: {
    en: 'From Issue Date',
    gu: 'આપ્યા તારીખ (શરૂઆત)',
  },
  to_issue_date: {
    en: 'To Issue Date',
    gu: 'આપ્યા તારીખ (સુધી)',
  },
  search_artisan_placeholder: {
    en: 'Search artisan name or serial no...',
    gu: 'કારીગરનું નામ અથવા સીરીયલ નં. શોધો...',
  },
  all_towns: {
    en: 'All Towns / Villages',
    gu: 'બધા ગામ / શહેર',
  },
  all_designs: {
    en: 'All Designs / Items',
    gu: 'બધી ડિઝાઇનો',
  },
  export_excel_csv: {
    en: 'Export Excel/CSV',
    gu: 'એક્સેલ / CSV ડાઉનલોડ',
  },
  print_report: {
    en: 'Print Report',
    gu: 'પ્રિન્ટ કાઢો',
  },
  refresh: {
    en: 'Refresh',
    gu: 'રિફ્રેશ',
  },
  table_date: {
    en: 'Date',
    gu: 'તારીખ',
  },
  table_serial_no: {
    en: 'Serial No.',
    gu: 'સીરીયલ નં.',
  },
  table_artisan_name: {
    en: 'Artisan Name',
    gu: 'કારીગરનું નામ',
  },
  table_town: {
    en: 'Town',
    gu: 'ગામ/શહેર',
  },
  table_remaining_pcs: {
    en: 'Remaining Pcs',
    gu: 'બાકી પીસ',
  },
  table_name_of_design: {
    en: 'Name of Design',
    gu: 'ડિઝાઇનનું નામ',
  },
  no_pending_work_found: {
    en: 'No pending work found for the selected filters',
    gu: 'પસંદ કરેલ ફિલ્ટરમાં કોઈ બાકી કામ મળ્યું નથી',
  },

  // Item Catalogue
  bandhej_item_catalogue: {
    en: 'Bandhej Item & Price Catalogue',
    gu: 'બાંધણી આઇટમ અને ભાવ સૂચિ',
  },
  add_new_item: {
    en: 'Add New Item',
    gu: '+ નવી ડિઝાઇન ઉમેરો',
  },
  total_designs: {
    en: 'Total Designs',
    gu: 'કુલ ડિઝાઇનો',
  },
  active_designs: {
    en: 'Active Designs',
    gu: 'સક્રિય ડિઝાઇનો',
  },
  search_items_placeholder: {
    en: "Search items by design name or serial no... (e.g. 'Soni', '1', '2')",
    gu: "ડિઝાઇનના નામ અથવા નંબરથી શોધો... (દા.ત. 'સોની', '1', '2')",
  },
  all: {
    en: 'All',
    gu: 'બધા',
  },
  active_only: {
    en: 'Active Only',
    gu: 'માત્ર સક્રિય',
  },
  inactive: {
    en: 'Inactive',
    gu: 'નિષ્ક્રિય',
  },
  col_serial_no: {
    en: 'Serial No.',
    gu: 'સીરીયલ નં.',
  },
  col_design_name: {
    en: 'Design / Item Name',
    gu: 'ડિઝાઇન / આઇટમનું નામ',
  },
  col_type: {
    en: 'Type',
    gu: 'પ્રકાર',
  },
  col_work_option: {
    en: 'Work Option',
    gu: 'કામનો પ્રકાર',
  },
  col_price_piece: {
    en: 'Price / Piece',
    gu: 'ભાવ / પીસ',
  },
  col_status: {
    en: 'Status',
    gu: 'સ્થિતિ',
  },
  col_created: {
    en: 'Created',
    gu: 'તારીખ',
  },
  col_actions: {
    en: 'Actions',
    gu: 'ક્રિયા',
  },

  // Workers
  search_workers_placeholder: {
    en: "Search by Full Name, Artisan ID (1, 2, PB-1), Mobile, Town...",
    gu: 'કારીગરનું પૂરું નામ, આઈડી (1, 2, PB-1), મોબાઈલ અથવા ગામથી શોધો...',
  },
  showing: {
    en: 'Showing',
    gu: 'દર્શાવેલ',
  },
  artisans: {
    en: 'artisans',
    gu: 'કારીગરો',
  },
  no_artisans_found: {
    en: 'No artisans found',
    gu: 'કોઈ કારીગર મળ્યા નથી',
  },
  clear_search_filter: {
    en: 'Clear Search Filter',
    gu: 'ફિલ્ટર સાફ કરો',
  },
  pending_pcs_label: {
    en: 'Pending Pcs',
    gu: 'બાકી પીસ',
  },
  payable_bal_label: {
    en: 'Payable Bal',
    gu: 'ચૂકવવાપાત્ર રકમ',
  },
  register_new_artisan_modal_title: {
    en: 'Register New Artisan Worker',
    gu: 'નવા કારીગર બહેનની નોંધણી',
  },
  full_name: {
    en: 'Full Name',
    gu: 'પૂરું નામ',
  },
  mobile_number: {
    en: 'Mobile Number',
    gu: 'મોબાઈલ નંબર',
  },
  town_city: {
    en: 'Town / Village',
    gu: 'ગામ / શહેર',
  },
  address: {
    en: 'Address / Street',
    gu: 'સરનામું',
  },
  cancel: {
    en: 'Cancel',
    gu: 'રદ કરો',
  },
  submit_register: {
    en: 'Register Artisan',
    gu: 'નોંધણી કરો',
  },

  // Header
  search_global_placeholder: {
    en: 'Search artisan workers, designs, town...',
    gu: 'કારીગર, ડિઝાઇન અથવા ગામ શોધો...',
  },
  owner_admin_role: {
    en: 'Owner / Admin (24/7)',
    gu: 'માલિક / એડમિન (24/7)',
  },
  workshop_manager_role: {
    en: 'Workshop Manager',
    gu: 'વર્કશોપ મેનેજર',
  },
  operating_hours_prefix: {
    en: 'Hours:',
    gu: 'સમય:',
  },

  // Worker Profile & Khata Ledger
  worker_directory: {
    en: 'Worker Directory',
    gu: 'કારીગરોની યાદી',
  },
  active: {
    en: 'Active',
    gu: 'સક્રિય',
  },
  joined: {
    en: 'Joined',
    gu: 'જોડાયા',
  },
  edit_details: {
    en: 'Edit Details',
    gu: 'વિગતો સુધારો',
  },
  remaining_pieces_card: {
    en: 'REMAINING PIECES',
    gu: 'બાકી રહેલ પીસ',
  },
  pieces_unit: {
    en: 'Pieces',
    gu: 'પીસ',
  },
  pcs_unit: {
    en: 'pcs',
    gu: 'પીસ',
  },
  currently_pending_artisan: {
    en: 'Currently pending with artisan',
    gu: 'કારીગર પાસે અત્યારે બાકી છે',
  },
  payable_balance_card: {
    en: 'PAYABLE BALANCE (EARNINGS − EARLIER PAID)',
    gu: 'ચૂકવવાપાત્ર રકમ (કમાણી − અગાઉ ચૂકવેલ)',
  },
  total_earned_label: {
    en: 'Total Earned',
    gu: 'કુલ કમાણી',
  },
  earlier_paid_label: {
    en: 'Earlier Paid',
    gu: 'અગાઉ ચૂકવેલ',
  },
  khata_title: {
    en: 'Artisan Work & Movement Ledger (Khata)',
    gu: 'કારીગર કામ અને ખાતાવહી (ખાતું)',
  },
  khata_subtitle: {
    en: 'Dual register: Received on Left and Given on Right (Oldest at top, latest at bottom)',
    gu: 'જમા ડાબી બાજુ અને ઉધાર (આપેલ) જમણી બાજુ (જૂનું ઉપર, નવું નીચે)',
  },
  give_work: {
    en: '+ Give Work',
    gu: '+ માલ / કામ આપો',
  },
  receive_return: {
    en: 'Receive Return',
    gu: 'જમા લો',
  },
  make_payment: {
    en: 'Make Payment',
    gu: 'ચૂકવણી કરો',
  },
  received_from_worker: {
    en: 'RECEIVED FROM WORKER',
    gu: 'કારીગર પાસેથી જમા મળેલ',
  },
  given_to_worker: {
    en: 'GIVEN TO WORKER',
    gu: 'કારીગરને આપેલ (ઉધાર)',
  },
  entry_unit: {
    en: 'Entry',
    gu: 'નોંધ',
  },
  entries_unit: {
    en: 'Entries',
    gu: 'નોંધો',
  },
  batch_unit: {
    en: 'Batch',
    gu: 'બેચ',
  },
  batches_unit: {
    en: 'Batches',
    gu: 'બેચ',
  },
  col_date: {
    en: 'Date',
    gu: 'તારીખ',
  },
  col_no_of_pcs: {
    en: 'No. of Pcs',
    gu: 'પીસની સંખ્યા',
  },
  col_amount: {
    en: 'Amount',
    gu: 'રકમ',
  },
  col_name_of_design: {
    en: 'Name of Design',
    gu: 'ડિઝાઇનનું નામ',
  },
  total_received: {
    en: 'TOTAL RECEIVED',
    gu: 'કુલ જમા મળેલ',
  },
  total_given: {
    en: 'TOTAL GIVEN',
    gu: 'કુલ આપેલ',
  },
  pending_badge: {
    en: 'pending',
    gu: 'બાકી',
  },
  receive_btn: {
    en: 'Receive',
    gu: 'જમા લો',
  },
  no_received_returns: {
    en: 'No received returns recorded yet.',
    gu: 'હજુ સુધી કોઈ જમા મળેલ નથી.',
  },
  no_given_items: {
    en: 'No given items recorded yet.',
    gu: 'હજુ સુધી કોઈ માલ આપેલ નથી.',
  },
  per_piece_symbol: {
    en: '/pc',
    gu: '/પીસ',
  },

  // Modals in WorkerProfile
  give_work_modal_title: {
    en: 'Give Work / Material Distribution Form',
    gu: 'માલ / કામ આપવાનું ફોર્મ (ઉધાર)',
  },
  give_work_modal_desc: {
    en: 'Dispatches raw cloth & tying thread. Automatically generates unique Distribution ID & snapshots piece price.',
    gu: 'કાચો માલ આપો. યુનિક ડિસ્ટ્રિબ્યુશન આઈડી બનશે અને ભાવ લોક થશે.',
  },
  issue_date_label: {
    en: 'Issue Date (IST)',
    gu: 'આપ્યા તારીખ (IST)',
  },
  select_artisan_label: {
    en: 'Select Woman Artisan Worker',
    gu: 'કારીગર બહેનની પસંદગી',
  },
  item_design_selection: {
    en: 'Item / Design Selection',
    gu: 'ડિઝાઇન / આઇટમ પસંદ કરો',
  },
  num_pieces_given_label: {
    en: 'Number of Pieces Given',
    gu: 'આપેલ પીસની સંખ્યા',
  },
  total_work_value_label: {
    en: 'Total Work Value (Auto-Calculated)',
    gu: 'કુલ મજૂરી રકમ (ઓટો ગણતરી)',
  },
  remarks_notes_label: {
    en: 'Remarks / Notes',
    gu: 'વિગત / નોંધ',
  },
  dispatch_consignment_btn: {
    en: 'Dispatch Consignment (Debit Material)',
    gu: 'માલ આપો (ઉધાર કરો)',
  },
  receive_return_modal_title: {
    en: 'Receive Work Return',
    gu: 'કામ જમા લો',
  },
  return_date_label: {
    en: 'Return Date (IST)',
    gu: 'જમા મળ્યા તારીખ (IST)',
  },
  accepted_pieces_label: {
    en: 'Accepted Pieces',
    gu: 'સ્વીકાર્ય (પાસ) પીસ',
  },
  rejected_pieces_label: {
    en: 'Rejected / QC Defect',
    gu: 'રિજેક્ટ / ખામીવાળા પીસ',
  },
  artisan_earned_wage_label: {
    en: 'Artisan Earned Wage:',
    gu: 'કારીગરની કમાણી:',
  },
  record_payment_modal_title: {
    en: 'Record Wage Payout / Advance',
    gu: 'કારીગરને ચૂકવણી / ઉપાડ નોંધો',
  },
  payment_type_label: {
    en: 'Payment Type',
    gu: 'ચૂકવણીનો પ્રકાર',
  },
  payment_amount_label: {
    en: 'Amount (₹)',
    gu: 'રકમ (₹)',
  },
  payment_mode_label: {
    en: 'Payment Mode',
    gu: 'ચૂકવણી પદ્ધતિ',
  },
  cash: {
    en: 'Cash',
    gu: 'રોકડા (Cash)',
  },
  bank_transfer: {
    en: 'Bank Transfer / NEFT',
    gu: 'બેંક ટ્રાન્સફર / NEFT',
  },
  upi: {
    en: 'UPI / GPay / PhonePe',
    gu: 'UPI (GPay / PhonePe)',
  },
  edit_artisan_details_title: {
    en: 'Edit Artisan Details',
    gu: 'કારીગરની વિગતો સુધારો',
  },
  save_changes: {
    en: 'Save Changes',
    gu: 'સાચવો',
  },

  // Payments Ledger
  payments_advances_ledger: {
    en: 'Payments & Cash Advances Ledger',
    gu: 'ચૂકવણી અને ઉપાડ ખાતાવહી',
  },
  payments_advances_desc: {
    en: 'Wage payments disbursed and cash/UPI advances given to artisan.',
    gu: 'કારીગરને ચૂકવેલ મજૂરી અને રોકડ/UPI ઉપાડ.',
  },
  record_payment_advance_btn: {
    en: '+ Record Payment / Advance',
    gu: '+ ચૂકવણી / ઉપાડ નોંધો',
  },
  no_payments_recorded: {
    en: 'No payments recorded yet for this artisan.',
    gu: 'હજુ સુધી કોઈ ચૂકવણી નોંધાયેલ નથી.',
  },
  col_payment_date: {
    en: 'Payment Date',
    gu: 'તારીખ',
  },
  col_category: {
    en: 'Category',
    gu: 'પ્રકાર',
  },
  col_mode: {
    en: 'Mode',
    gu: 'પદ્ધતિ',
  },
  col_receipt_ref: {
    en: 'Receipt / Ref No',
    gu: 'રસીદ / રેફરન્સ નં.',
  },
  col_authorized_by: {
    en: 'Authorized By',
    gu: 'મંજૂર કરનાર',
  },
  col_notes: {
    en: 'Notes',
    gu: 'નોંધ',
  },
  wage_payout: {
    en: 'Wage Payout',
    gu: 'મજૂરી ચૂકવણી',
  },
  cash_advance: {
    en: 'Cash Advance',
    gu: 'રોકડ ઉપાડ',
  },
  bonus: {
    en: 'Bonus',
    gu: 'બોનસ',
  },
  cash_ledger: {
    en: 'Cash Ledger',
    gu: 'રોકડ ખાતું',
  },
  active_artisan: {
    en: 'Active Artisan',
    gu: 'સક્રિય કારીગર',
  },
  serial_label: {
    en: 'Serial',
    gu: 'સીરીયલ',
  },
  town_label: {
    en: 'Town',
    gu: 'ગામ/શહેર',
  },
  price_protection_title: {
    en: 'Historical Price Protection:',
    gu: 'ઐતિહાસિક ભાવ સુરક્ષા:',
  },
  price_protection_desc: {
    en: 'The current catalogue rate will be permanently locked into this transaction. Multiple consignments can be assigned to this worker today.',
    gu: 'આ વ્યવહાર માટે વર્તમાન સૂચિ ભાવ કાયમ માટે લોક કરવામાં આવશે.',
  },
  issuing_consignment: {
    en: 'Issuing Consignment...',
    gu: 'માલ અપાઈ રહ્યો છે...',
  },
  batch_label: {
    en: 'Batch',
    gu: 'બેચ',
  },
  issued_label: {
    en: 'Issued',
    gu: 'આપેલ',
  },
  pending_label: {
    en: 'Pending',
    gu: 'બાકી',
  },
  piece_rate_label: {
    en: 'Piece Rate',
    gu: 'પીસ ભાવ',
  },
  generates_wage_note: {
    en: 'Generates artisan wage',
    gu: 'કારીગરની મજૂરી જમા થશે',
  },
  zero_wage_note: {
    en: '₹0.00 wage credited',
    gu: '₹0.00 મજૂરી',
  },
  defect_reason_label: {
    en: 'Defect / Rejection Reason',
    gu: 'ખામી / રિજેક્ટનું કારણ',
  },
  defect_broken_knots: {
    en: 'Broken Knots / Missing Knots',
    gu: 'ગાંઠ તૂટેલી / ખૂટતી ગાંઠ',
  },
  defect_torn_fabric: {
    en: 'Fabric Torn / Needle Punched',
    gu: 'કાપડ ફાટેલું / સોયની કાણી',
  },
  defect_uneven_knots: {
    en: 'Uneven / Irregular Knots',
    gu: 'અસમાન / અનિયમિત ગાંઠ',
  },
  defect_stains: {
    en: 'Stains / Dye Bleed / Discoloration',
    gu: 'ડાઘ / કલર ખરાબ',
  },
  defect_mismatch: {
    en: 'Pattern / Design Mismatch',
    gu: 'ડિઝાઇન અલગ',
  },
  defect_loose: {
    en: 'Loose Knotting (Unraveling)',
    gu: 'ઢીલી ગાંઠ (છૂટી જવી)',
  },
  defect_other: {
    en: 'Other Defect',
    gu: 'અન્ય ખામી',
  },
  recording_return: {
    en: 'Recording Return...',
    gu: 'જમા લેવાઈ રહ્યું છે...',
  },
  record_return_btn: {
    en: 'Record Return & Credit Balance',
    gu: 'જમા લો અને રકમ ખાતામાં ઉમેરો',
  },
  wage_payout_option: {
    en: 'Wage Payout (Deducts from Payable Balance)',
    gu: 'મજૂરી ચૂકવણી (બાકીમાંથી કપાશે)',
  },
  cash_advance_option: {
    en: 'Cash Advance (Deducts from Payable Balance)',
    gu: 'રોકડ ઉપાડ (બાકીમાંથી કપાશે)',
  },
  bonus_option: {
    en: 'Artisan Festival Bonus (Adds to Balance)',
    gu: 'તહેવાર બોનસ (રકમ ઉમેરાશે)',
  },
  default_net_balance_note: {
    en: 'Default set to current net payable balance:',
    gu: 'ચૂકવવાપાત્ર રકમ મુજબ સેટ કરેલ:',
  },
  cash_at_workshop: {
    en: 'Cash at Workshop',
    gu: 'વર્કશોપ પર રોકડા (Cash)',
  },
  bank_transfer_option: {
    en: 'Bank Transfer (IMPS/NEFT)',
    gu: 'બેંક ટ્રાન્સફર (IMPS/NEFT)',
  },
  upi_option: {
    en: 'UPI / Google Pay',
    gu: 'UPI (Google Pay / PhonePe)',
  },
  receipt_ref_label: {
    en: 'Receipt / Reference No. (Optional)',
    gu: 'રસીદ / રેફરન્સ નંબર (મરજિયાત)',
  },
  notes_purpose_label: {
    en: 'Notes / Purpose',
    gu: 'નોંધ / વિગત',
  },
  confirm_payment_btn: {
    en: 'Confirm Payment',
    gu: 'ચૂકવણી કન્ફર્મ કરો',
  },
  status_label: {
    en: 'Status',
    gu: 'સ્થિતિ',
  },
  specialization_remarks_label: {
    en: 'Specialization / Remarks',
    gu: 'કારીગરી વિશેષતા / નોંધ',
  },
  designs_unit: {
    en: 'Designs',
    gu: 'ડિઝાઇનો',
  },
  artisan_serial_batch: {
    en: 'Artisan / Serial / Batch',
    gu: 'કારીગર / સીરીયલ / બેચ',
  },
  search_report_placeholder: {
    en: 'e.g. Simaben, 1, PB-1...',
    gu: 'દા.ત. સીમાબેન, 1, PB-1...',
  },
  filter_by_town: {
    en: 'Filter by Town',
    gu: 'ગામ / શહેર પસંદ કરો',
  },
  filter_by_design: {
    en: 'Filter by Design',
    gu: 'ડિઝાઇન પસંદ કરો',
  },
  all_pending_distributions: {
    en: 'All Pending Distributions',
    gu: 'બધા બાકી પીસ',
  },
  group_by_artisan: {
    en: 'Group by Artisan',
    gu: 'કારીગર પ્રમાણે',
  },
  sort_by_label: {
    en: 'Sort by:',
    gu: 'ક્રમ:',
  },
  sort_oldest_first: {
    en: 'Oldest Issue Date (Ascending)',
    gu: 'જૂની તારીખ પ્રથમ',
  },
  sort_newest_first: {
    en: 'Newest Issue Date (Descending)',
    gu: 'નવી તારીખ પ્રથમ',
  },
  sort_pending_desc: {
    en: 'Highest Pending Pcs First',
    gu: 'વધુ બાકી પીસ પ્રથમ',
  },
  sort_name_asc: {
    en: 'Artisan Name (A-Z)',
    gu: 'કારીગરનું નામ (A-Z)',
  },
  create_manager: {
    en: 'Create Manager',
    gu: 'મેનેજર ઉમેરો',
  },
  operational_status: {
    en: 'OPERATIONAL',
    gu: 'ચાલુ / સક્રિય',
  },
  locked_by_admin: {
    en: 'LOCKED BY ADMIN',
    gu: 'એડમિન દ્વારા લોક',
  },
  disabled_status: {
    en: 'DISABLED',
    gu: 'નિષ્ક્રિય',
  },
  permitted_hours_label: {
    en: 'Permitted Hours (IST):',
    gu: 'માન્ય સમય (IST):',
  },
  temporary_extension_label: {
    en: 'Temporary Extension:',
    gu: 'હંગામી મુદત:',
  },
  lock_reason_label: {
    en: 'Lock Reason:',
    gu: 'લોક કરવાનું કારણ:',
  },
  last_login_label: {
    en: 'Last Login:',
    gu: 'છેલ્લું લોગિન:',
  },
  never_logged_in: {
    en: 'Never logged in',
    gu: 'ક્યારેય લોગિન નથી કર્યું',
  },
  lock_immediately: {
    en: 'Lock Immediately',
    gu: 'તરત લોક કરો',
  },
  unlock_account: {
    en: 'Unlock Account',
    gu: 'અનલોક કરો',
  },
  edit_hours: {
    en: 'Edit Hours',
    gu: 'સમય બદલો',
  },
  extend_hours: {
    en: '+ Extend Hours',
    gu: '+ સમય લંબાવો',
  },
  disable_btn: {
    en: 'Disable',
    gu: 'બંધ કરો',
  },
  enable_btn: {
    en: 'Enable',
    gu: 'ચાલુ કરો',
  },
  total_across_consignments: {
    en: 'Total Across',
    gu: 'કુલ બાકી માલ',
  },
  pending_consignments: {
    en: 'Pending Consignments:',
    gu: 'બાકી નોંધ:',
  },
};

const entityDictionary: Record<string, string> = {
  // Workers & Users
  'Simaben': 'સીમાબેન',
  'Radhikaben': 'રાધિકાબેન',
  'Radhaben': 'રાધાબેન',
  'Geetaben': 'ગીતાબેન',
  'Laxmiben': 'લક્ષ્મીબેન',
  'Jashodaben': 'જશોદાબેન',
  'Meenaben': 'મીનાબેન',
  'Dhanlaxmiben': 'ધનલક્ષ્મીબેન',
  'Ramilaben': 'રમિલાબેન',
  'Kokilaben': 'કોકિલાબેન',
  'Hansaben': 'હંસાબેન',
  'Bhavna Mehta (Admin)': 'ભાવના મહેતા (એડમિન)',
  'Bhavna Mehta (Owner)': 'ભાવના મહેતા (માલિક)',
  'Rajesh Patel (Manager)': 'રાજેશ પટેલ (મેનેજર)',
  'Rajesh Patel': 'રાજેશ પટેલ',
  'Admin': 'એડમિન',
  // Locations
  'Anjar': 'અંજાર',
  'Lalpur': 'લાલપુર',
  'Navapara': 'નવાપરા',
  'Bhuj': 'ભુજ',
  'Mandvi': 'માંડવી',
  'Mundra': 'મુંદ્રા',
  'Nakhatrana': 'નખત્રાણા',
  'Bhachau': 'ભચાઉ',
  'Gandhidham': 'ગાંધીધામ',
  'Kutch': 'કચ્છ',
  'Gujarat': 'ગુજરાત',
  'Near Bazar': 'બજાર પાસે',
  'Main Bazar': 'મુખ્ય બજાર',
  'Khatri Chowk': 'ખત્રી ચોક',
  // Items & Designs
  'Soni': 'સોની',
  'Shilpi': 'શિલ્પી',
  'suit': 'સુટ',
  'Suit': 'સુટ',
  'Dress': 'ડ્રેસ',
  'Rani': 'રાણી',
  'Saree': 'સાડી',
  'Dupatta': 'દુપટ્ટો',
  'Chaniya Choli': 'ચણિયા ચોળી',
  'Dress Material': 'ડ્રેસ મટિરિયલ',
  'Kurti': 'કુર્તી',
  'Stole': 'સ્ટોલ',
  'Gajji Silk': 'ગજ્જી સિલ્ક',
  'Gajji': 'ગજ્જી',
  'Modal Silk': 'મોડાલ સિલ્ક',
  'Modal': 'મોડાલ',
  'Cotton': 'કોટન',
  'Pure Silk': 'પ્યોર સિલ્ક',
  // Knot styles
  'Bharti': 'ભારતી',
  'Ekdali': 'એકડાળી',
  'Shikari': 'શિકારી',
  'Jaal': 'જાળ',
  'Kodi': 'કોડી',
  'Standard Bandhej': 'સ્ટાન્ડર્ડ બાંધણી',
  'Standard': 'સ્ટાન્ડર્ડ',
  'Choot': 'છૂટ',
  'Sarkam': 'સરકમ',
};

export function translateEntityName(text: string | null | undefined, language: Language): string {
  if (!text) return '';
  if (language !== 'gu') return text;
  
  if (entityDictionary[text]) {
    return entityDictionary[text];
  }

  let translated = text;
  for (const [en, gu] of Object.entries(entityDictionary)) {
    if (translated.includes(en)) {
      translated = translated.split(en).join(gu);
    }
  }
  return translated;
}
