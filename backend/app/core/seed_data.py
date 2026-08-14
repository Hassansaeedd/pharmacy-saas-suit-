from datetime import date, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.inventory import Medicine, Batch, Supplier

# 100 Essential Pakistani Medicines Dataset
PAKISTANI_MEDICINES_SEED: List[Dict[str, Any]] = [
    # Analgesics & Anti-inflammatory
    {"brand": "Panadol 500mg", "generic": "Paracetamol", "category": "tablet", "rx": False, "unit": "strip", "cost": 30.0, "price": 40.0, "threshold": 50},
    {"brand": "Panadol Extra", "generic": "Paracetamol + Caffeine", "category": "tablet", "rx": False, "unit": "strip", "cost": 45.0, "price": 60.0, "threshold": 40},
    {"brand": "Panadol CF", "generic": "Paracetamol + Pseudoephedrine", "category": "tablet", "rx": False, "unit": "strip", "cost": 50.0, "price": 70.0, "threshold": 30},
    {"brand": "Disprin 300mg", "generic": "Aspirin", "category": "tablet", "rx": False, "unit": "strip", "cost": 15.0, "price": 25.0, "threshold": 50},
    {"brand": "Ponstan 250mg", "generic": "Mefenamic Acid", "category": "capsule", "rx": False, "unit": "strip", "cost": 35.0, "price": 50.0, "threshold": 30},
    {"brand": "Ponstan Forte 500mg", "generic": "Mefenamic Acid", "category": "tablet", "rx": False, "unit": "strip", "cost": 60.0, "price": 85.0, "threshold": 30},
    {"brand": "Brufen 200mg", "generic": "Ibuprofen", "category": "tablet", "rx": False, "unit": "strip", "cost": 25.0, "price": 35.0, "threshold": 40},
    {"brand": "Brufen 400mg", "generic": "Ibuprofen", "category": "tablet", "rx": False, "unit": "strip", "cost": 40.0, "price": 55.0, "threshold": 40},
    {"brand": "Brufen Syrup 120ml", "generic": "Ibuprofen", "category": "syrup", "rx": False, "unit": "bottle", "cost": 80.0, "price": 110.0, "threshold": 20},
    {"brand": "Calpol Syrup 90ml", "generic": "Paracetamol", "category": "syrup", "rx": False, "unit": "bottle", "cost": 65.0, "price": 90.0, "threshold": 25},
    {"brand": "Voltral 50mg", "generic": "Diclofenac Sodium", "category": "tablet", "rx": False, "unit": "strip", "cost": 50.0, "price": 75.0, "threshold": 30},
    {"brand": "Voltral Emulgel 20g", "generic": "Diclofenac Diethylamine", "category": "topical", "rx": False, "unit": "pack", "cost": 140.0, "price": 190.0, "threshold": 15},
    {"brand": "Febrol 500mg", "generic": "Paracetamol", "category": "tablet", "rx": False, "unit": "strip", "cost": 20.0, "price": 30.0, "threshold": 50},
    {"brand": "Synflex 550mg", "generic": "Naproxen Sodium", "category": "tablet", "rx": False, "unit": "strip", "cost": 90.0, "price": 130.0, "threshold": 20},
    {"brand": "Tramal 50mg", "generic": "Tramadol Hydrochloride", "category": "capsule", "rx": True, "unit": "strip", "cost": 120.0, "price": 170.0, "threshold": 15},

    # Antibiotics & Antimicrobials
    {"brand": "Augmentin 375mg", "generic": "Co-Amoxiclav", "category": "tablet", "rx": True, "unit": "box", "cost": 220.0, "price": 290.0, "threshold": 20},
    {"brand": "Augmentin 625mg", "generic": "Co-Amoxiclav", "category": "tablet", "rx": True, "unit": "box", "cost": 310.0, "price": 410.0, "threshold": 25},
    {"brand": "Augmentin 1g", "generic": "Co-Amoxiclav", "category": "tablet", "rx": True, "unit": "box", "cost": 450.0, "price": 580.0, "threshold": 20},
    {"brand": "Augmentin DS Syrup 156.25mg", "generic": "Co-Amoxiclav", "category": "syrup", "rx": True, "unit": "bottle", "cost": 180.0, "price": 240.0, "threshold": 15},
    {"brand": "Amoxil 250mg", "generic": "Amoxicillin", "category": "capsule", "rx": True, "unit": "strip", "cost": 70.0, "price": 95.0, "threshold": 30},
    {"brand": "Amoxil 500mg", "generic": "Amoxicillin", "category": "capsule", "rx": True, "unit": "strip", "cost": 120.0, "price": 160.0, "threshold": 30},
    {"brand": "Velosef 250mg", "generic": "Cephradine", "category": "capsule", "rx": True, "unit": "strip", "cost": 110.0, "price": 150.0, "threshold": 20},
    {"brand": "Velosef 500mg", "generic": "Cephradine", "category": "capsule", "rx": True, "unit": "strip", "cost": 190.0, "price": 250.0, "threshold": 20},
    {"brand": "Ciproxin 250mg", "generic": "Ciprofloxacin", "category": "tablet", "rx": True, "unit": "strip", "cost": 140.0, "price": 190.0, "threshold": 20},
    {"brand": "Ciproxin 500mg", "generic": "Ciprofloxacin", "category": "tablet", "rx": True, "unit": "strip", "cost": 240.0, "price": 320.0, "threshold": 20},
    {"brand": "Flagyl 200mg", "generic": "Metronidazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 30.0, "price": 45.0, "threshold": 40},
    {"brand": "Flagyl 400mg", "generic": "Metronidazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 50.0, "price": 70.0, "threshold": 40},
    {"brand": "Flagyl Suspension 90ml", "generic": "Metronidazole", "category": "syrup", "rx": False, "unit": "bottle", "cost": 60.0, "price": 85.0, "threshold": 25},
    {"brand": "Klaricid 250mg", "generic": "Clarithromycin", "category": "tablet", "rx": True, "unit": "strip", "cost": 320.0, "price": 420.0, "threshold": 15},
    {"brand": "Klaricid 500mg", "generic": "Clarithromycin", "category": "tablet", "rx": True, "unit": "strip", "cost": 550.0, "price": 720.0, "threshold": 15},
    {"brand": "Zithromax 250mg", "generic": "Azithromycin", "category": "capsule", "rx": True, "unit": "strip", "cost": 280.0, "price": 370.0, "threshold": 20},
    {"brand": "Azomax 500mg", "generic": "Azithromycin", "category": "capsule", "rx": True, "unit": "strip", "cost": 340.0, "price": 450.0, "threshold": 20},
    {"brand": "Leflox 250mg", "generic": "Levofloxacin", "category": "tablet", "rx": True, "unit": "strip", "cost": 210.0, "price": 280.0, "threshold": 15},
    {"brand": "Leflox 500mg", "generic": "Levofloxacin", "category": "tablet", "rx": True, "unit": "strip", "cost": 380.0, "price": 490.0, "threshold": 15},

    # Gastrointestinal & Antacids
    {"brand": "Risek 20mg", "generic": "Omeprazole", "category": "capsule", "rx": False, "unit": "strip", "cost": 120.0, "price": 160.0, "threshold": 35},
    {"brand": "Risek 40mg", "generic": "Omeprazole", "category": "capsule", "rx": False, "unit": "strip", "cost": 200.0, "price": 270.0, "threshold": 30},
    {"brand": "Nexum 20mg", "generic": "Esomeprazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 150.0, "price": 200.0, "threshold": 30},
    {"brand": "Nexum 40mg", "generic": "Esomeprazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 250.0, "price": 340.0, "threshold": 25},
    {"brand": "Entamizole 250mg", "generic": "Diloxanide + Metronidazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 45.0, "price": 65.0, "threshold": 30},
    {"brand": "Entamizole DS", "generic": "Diloxanide + Metronidazole", "category": "tablet", "rx": False, "unit": "strip", "cost": 75.0, "price": 105.0, "threshold": 30},
    {"brand": "Gaviscon Liquid 120ml", "generic": "Sodium Alginate + Antacid", "category": "syrup", "rx": False, "unit": "bottle", "cost": 160.0, "price": 220.0, "threshold": 20},
    {"brand": "Gravinate 50mg", "generic": "Dimenhydrinate", "category": "tablet", "rx": False, "unit": "strip", "cost": 25.0, "price": 38.0, "threshold": 40},
    {"brand": "Gravinate Syrup 60ml", "generic": "Dimenhydrinate", "category": "syrup", "rx": False, "unit": "bottle", "cost": 50.0, "price": 70.0, "threshold": 20},
    {"brand": "Motilium 10mg", "generic": "Domperidone", "category": "tablet", "rx": False, "unit": "strip", "cost": 65.0, "price": 90.0, "threshold": 30},
    {"brand": "Spasler P", "generic": "Tiemonium Methylsulfate", "category": "tablet", "rx": False, "unit": "strip", "cost": 80.0, "price": 110.0, "threshold": 25},
    {"brand": "Zantac 150mg", "generic": "Ranitidine", "category": "tablet", "rx": False, "unit": "strip", "cost": 40.0, "price": 60.0, "threshold": 20},

    # Cardiovascular & Antihypertensive
    {"brand": "Loprin 75mg", "generic": "Aspirin (Low Dose)", "category": "tablet", "rx": False, "unit": "strip", "cost": 20.0, "price": 30.0, "threshold": 50},
    {"brand": "Loprin 150mg", "generic": "Aspirin", "category": "tablet", "rx": False, "unit": "strip", "cost": 30.0, "price": 45.0, "threshold": 40},
    {"brand": "Capoten 25mg", "generic": "Captopril", "category": "tablet", "rx": True, "unit": "strip", "cost": 60.0, "price": 85.0, "threshold": 20},
    {"brand": "Tenormin 50mg", "generic": "Atenolol", "category": "tablet", "rx": True, "unit": "strip", "cost": 90.0, "price": 125.0, "threshold": 25},
    {"brand": "Norvasc 5mg", "generic": "Amlodipine", "category": "tablet", "rx": True, "unit": "strip", "cost": 110.0, "price": 150.0, "threshold": 25},
    {"brand": "Norvasc 10mg", "generic": "Amlodipine", "category": "tablet", "rx": True, "unit": "strip", "cost": 180.0, "price": 240.0, "threshold": 20},
    {"brand": "Concor 2.5mg", "generic": "Bisoprolol Fumarate", "category": "tablet", "rx": True, "unit": "strip", "cost": 130.0, "price": 175.0, "threshold": 20},
    {"brand": "Concor 5mg", "generic": "Bisoprolol Fumarate", "category": "tablet", "rx": True, "unit": "strip", "cost": 220.0, "price": 290.0, "threshold": 20},
    {"brand": "Exforge 5/80mg", "generic": "Amlodipine + Valsartan", "category": "tablet", "rx": True, "unit": "box", "cost": 550.0, "price": 720.0, "threshold": 15},
    {"brand": "Inderal 10mg", "generic": "Propranolol", "category": "tablet", "rx": True, "unit": "strip", "cost": 25.0, "price": 38.0, "threshold": 30},
    {"brand": "Coversyl 4mg", "generic": "Perindopril", "category": "tablet", "rx": True, "unit": "box", "cost": 380.0, "price": 490.0, "threshold": 15},

    # Antidiabetic
    {"brand": "Glucophage 500mg", "generic": "Metformin HCl", "category": "tablet", "rx": True, "unit": "strip", "cost": 30.0, "price": 45.0, "threshold": 50},
    {"brand": "Glucophage 850mg", "generic": "Metformin HCl", "category": "tablet", "rx": True, "unit": "strip", "cost": 45.0, "price": 65.0, "threshold": 40},
    {"brand": "Glucophage XR 1000mg", "generic": "Metformin Extended Release", "category": "tablet", "rx": True, "unit": "strip", "cost": 90.0, "price": 125.0, "threshold": 35},
    {"brand": "Amaryl 1mg", "generic": "Glimepiride", "category": "tablet", "rx": True, "unit": "strip", "cost": 80.0, "price": 110.0, "threshold": 20},
    {"brand": "Amaryl 2mg", "generic": "Glimepiride", "category": "tablet", "rx": True, "unit": "strip", "cost": 130.0, "price": 175.0, "threshold": 25},
    {"brand": "Janumet 50/500mg", "generic": "Sitagliptin + Metformin", "category": "tablet", "rx": True, "unit": "box", "cost": 650.0, "price": 840.0, "threshold": 15},
    {"brand": "Galvus Met 50/500mg", "generic": "Vildagliptin + Metformin", "category": "tablet", "rx": True, "unit": "box", "cost": 580.0, "price": 760.0, "threshold": 15},
    {"brand": "Diamicron MR 60mg", "generic": "Gliclazide", "category": "tablet", "rx": True, "unit": "strip", "cost": 210.0, "price": 280.0, "threshold": 20},

    # Respiratory, Antihistamines & Allergy
    {"brand": "Softin 10mg", "generic": "Loratadine", "category": "tablet", "rx": False, "unit": "strip", "cost": 45.0, "price": 65.0, "threshold": 30},
    {"brand": "Zyrtec 10mg", "generic": "Cetirizine HCl", "category": "tablet", "rx": False, "unit": "strip", "cost": 60.0, "price": 85.0, "threshold": 30},
    {"brand": "Rigix 10mg", "generic": "Cetirizine HCl", "category": "tablet", "rx": False, "unit": "strip", "cost": 50.0, "price": 70.0, "threshold": 30},
    {"brand": "Ventolin Inhaler 100mcg", "generic": "Salbutamol", "category": "topical", "rx": True, "unit": "pack", "cost": 220.0, "price": 290.0, "threshold": 20},
    {"brand": "Ventolin Syrup 120ml", "generic": "Salbutamol", "category": "syrup", "rx": False, "unit": "bottle", "cost": 65.0, "price": 90.0, "threshold": 20},
    {"brand": "Acefyl Cough Syrup 120ml", "generic": "Acefyline Piperazine", "category": "syrup", "rx": False, "unit": "bottle", "cost": 75.0, "price": 105.0, "threshold": 25},
    {"brand": "Hydryllin Syrup 120ml", "generic": "Aminophylline + Diphenhydramine", "category": "syrup", "rx": False, "unit": "bottle", "cost": 70.0, "price": 95.0, "threshold": 25},
    {"brand": "Telfast 120mg", "generic": "Fexofenadine", "category": "tablet", "rx": False, "unit": "strip", "cost": 160.0, "price": 215.0, "threshold": 20},
    {"brand": "Monteka 10mg", "generic": "Montelukast", "category": "tablet", "rx": True, "unit": "strip", "cost": 180.0, "price": 240.0, "threshold": 20},

    # Vitamins & Supplements
    {"brand": "Sangobion Capsules", "generic": "Iron + Folic Acid + B Complex", "category": "capsule", "rx": False, "unit": "strip", "cost": 90.0, "price": 125.0, "threshold": 30},
    {"brand": "CAC-1000 Plus Effervescent", "generic": "Calcium + Vitamin C + D3", "category": "tablet", "rx": False, "unit": "pack", "cost": 220.0, "price": 290.0, "threshold": 25},
    {"brand": "Surbex Z", "generic": "Zinc + B Complex + Vitamin C", "category": "tablet", "rx": False, "unit": "bottle", "cost": 310.0, "price": 410.0, "threshold": 25},
    {"brand": "Neurobion", "generic": "Vitamin B1 + B6 + B12", "category": "tablet", "rx": False, "unit": "strip", "cost": 85.0, "price": 115.0, "threshold": 35},
    {"brand": "Evion 400mg", "generic": "Vitamin E (Tocopheryl Acetate)", "category": "capsule", "rx": False, "unit": "strip", "cost": 70.0, "price": 95.0, "threshold": 40},
    {"brand": "Osteocare", "generic": "Calcium + Magnesium + Vitamin D3", "category": "tablet", "rx": False, "unit": "box", "cost": 380.0, "price": 490.0, "threshold": 20},
    {"brand": "Theragran-M", "generic": "Multivitamins + Minerals", "category": "tablet", "rx": False, "unit": "bottle", "cost": 260.0, "price": 350.0, "threshold": 20},
    {"brand": "Fefol Vit", "generic": "Iron + Folic Acid + Vit C", "category": "capsule", "rx": False, "unit": "strip", "cost": 100.0, "price": 135.0, "threshold": 25},

    # Dermatological & Antiseptic
    {"brand": "Polyfax Ointment 20g", "generic": "Polymyxin B + Bacitracin", "category": "topical", "rx": False, "unit": "pack", "cost": 80.0, "price": 110.0, "threshold": 25},
    {"brand": "Polyfax Eye Ointment 4g", "generic": "Polymyxin B + Bacitracin", "category": "topical", "rx": False, "unit": "pack", "cost": 50.0, "price": 70.0, "threshold": 20},
    {"brand": "Betnovate Cream 15g", "generic": "Betamethasone Valerate", "category": "topical", "rx": False, "unit": "pack", "cost": 70.0, "price": 95.0, "threshold": 25},
    {"brand": "Betnovate N Cream 15g", "generic": "Betamethasone + Neomycin", "category": "topical", "rx": False, "unit": "pack", "cost": 85.0, "price": 115.0, "threshold": 25},
    {"brand": "Dermovate Cream 15g", "generic": "Clobetasol Propionate", "category": "topical", "rx": True, "unit": "pack", "cost": 110.0, "price": 150.0, "threshold": 20},
    {"brand": "Canesten Cream 20g", "generic": "Clotrimazole", "category": "topical", "rx": False, "unit": "pack", "cost": 130.0, "price": 175.0, "threshold": 20},
    {"brand": "Fucidin Cream 15g", "generic": "Fusidic Acid", "category": "topical", "rx": True, "unit": "pack", "cost": 190.0, "price": 250.0, "threshold": 15},
    {"brand": "Terbiderm Cream 10g", "generic": "Terbinafine HCl", "category": "topical", "rx": False, "unit": "pack", "cost": 140.0, "price": 190.0, "threshold": 15},

    # ENT & Eye Drops
    {"brand": "Tobrex Eye Drops 5ml", "generic": "Tobramycin", "category": "drops", "rx": True, "unit": "bottle", "cost": 160.0, "price": 215.0, "threshold": 20},
    {"brand": "Ciplox Eye/Ear Drops 5ml", "generic": "Ciprofloxacin", "category": "drops", "rx": False, "unit": "bottle", "cost": 65.0, "price": 90.0, "threshold": 25},
    {"brand": "Otrivin Adult Nasal Spray 10ml", "generic": "Xylometazoline HCl", "category": "drops", "rx": False, "unit": "bottle", "cost": 110.0, "price": 150.0, "threshold": 20},
    {"brand": "Otrivin Pediatric Drops 10ml", "generic": "Xylometazoline HCl", "category": "drops", "rx": False, "unit": "bottle", "cost": 90.0, "price": 125.0, "threshold": 20},

    # Controlled & Prescription Sedatives
    {"brand": "Lexotanil 3mg", "generic": "Bromazepam", "category": "tablet", "rx": True, "unit": "strip", "cost": 140.0, "price": 190.0, "threshold": 15},
    {"brand": "Xanax 0.5mg", "generic": "Alprazolam", "category": "tablet", "rx": True, "unit": "strip", "cost": 120.0, "price": 160.0, "threshold": 15},
    {"brand": "Valium 5mg", "generic": "Diazepam", "category": "tablet", "rx": True, "unit": "strip", "cost": 80.0, "price": 110.0, "threshold": 15},
    {"brand": "Rivotril 2mg", "generic": "Clonazepam", "category": "tablet", "rx": True, "unit": "strip", "cost": 160.0, "price": 215.0, "threshold": 15},
]

async def seed_pharmacy_catalog(db: AsyncSession, business_id: int):
    """
    Automatically populates 100 essential Pakistani medicines and sample stock batches
    when a new pharmacy registers so they have an immediate working catalog.
    """
    # Create Default Supplier
    supplier = Supplier(
        business_id=business_id,
        name="GSK & National Pharma Distributors Pakistan",
        contact="+92 21 111 475 754",
        address="Korangi Industrial Area, Karachi, Pakistan"
    )
    db.add(supplier)
    await db.flush()

    today = date.today()

    for idx, item in enumerate(PAKISTANI_MEDICINES_SEED):
        barcode_str = f"890{idx+1001:09d}" # Standard 13-digit EAN/Pakistani barcode format
        med = Medicine(
            business_id=business_id,
            brand_name=item["brand"],
            generic_name=item["generic"],
            category=item["category"],
            requires_prescription=item["rx"],
            unit_type=item["unit"],
            purchase_price=item["cost"],
            sale_price=item["price"],
            reorder_threshold=item["threshold"],
            barcode=barcode_str
        )
        db.add(med)
        await db.flush()

        # Add initial sample batch for each medicine (varied expiry dates)
        exp_days = 90 + ((idx * 7) % 360) # Staggered 3 to 12 months ahead
        qty = 40 + ((idx * 13) % 80)      # Stock between 40 and 120 units

        batch = Batch(
            business_id=business_id,
            medicine_id=med.id,
            batch_number=f"BATCH-PK-2026-{idx+1:03d}",
            expiry_date=today + timedelta(days=exp_days),
            quantity_in_stock=qty,
            received_date=today,
            supplier_id=supplier.id,
            purchase_price=item["cost"],
            barcode=f"B-{barcode_str}"
        )
        db.add(batch)

    await db.commit()
