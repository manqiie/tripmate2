# trips/checklist_service.py - Service for generating trip-specific checklists
class ChecklistService:
    """Service for generating personalized checklists based on trip type"""
    
    @staticmethod
    def get_default_checklist_templates():
        """Get all default checklist templates"""
        return {
            'leisure': [
                # Documents
                {"id": 1, "text": "Check passport validity (6+ months remaining)", "category": "documents", "completed": False, "priority": "high"},
                {"id": 2, "text": "Obtain travel visa if required", "category": "documents", "completed": False, "priority": "high"},
                {"id": 3, "text": "Print/save travel insurance documents", "category": "documents", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Make copies of important documents", "category": "documents", "completed": False, "priority": "medium"},
                
                # Booking
                {"id": 5, "text": "Book accommodation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 6, "text": "Book flights/transportation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 7, "text": "Research and book activities/tours", "category": "booking", "completed": False, "priority": "low"},
                {"id": 8, "text": "Make restaurant reservations", "category": "booking", "completed": False, "priority": "low"},
                
                # Health & Safety
                {"id": 9, "text": "Check vaccination requirements", "category": "health", "completed": False, "priority": "high"},
                {"id": 10, "text": "Pack prescription medications", "category": "health", "completed": False, "priority": "high"},
                {"id": 11, "text": "Pack first aid kit", "category": "health", "completed": False, "priority": "medium"},
                
                # Money & Communication
                {"id": 12, "text": "Notify bank of travel plans", "category": "finance", "completed": False, "priority": "high"},
                {"id": 13, "text": "Exchange currency or get travel card", "category": "finance", "completed": False, "priority": "medium"},
                {"id": 14, "text": "Check international roaming plans", "category": "communication", "completed": False, "priority": "medium"},
                
                # Packing
                {"id": 15, "text": "Pack weather-appropriate clothing", "category": "packing", "completed": False, "priority": "medium"},
                {"id": 16, "text": "Pack electronics and chargers", "category": "packing", "completed": False, "priority": "medium"},
                {"id": 17, "text": "Pack toiletries and personal items", "category": "packing", "completed": False, "priority": "medium"},
                
                # Home preparation
                {"id": 18, "text": "Arrange pet/house sitting", "category": "home", "completed": False, "priority": "medium"},
                {"id": 19, "text": "Stop mail/package delivery", "category": "home", "completed": False, "priority": "low"},
                {"id": 20, "text": "Set home security systems", "category": "home", "completed": False, "priority": "medium"},
            ],
            
            'business': [
                # Documents
                {"id": 1, "text": "Check passport validity", "category": "documents", "completed": False, "priority": "high"},
                {"id": 2, "text": "Obtain business visa if required", "category": "documents", "completed": False, "priority": "high"},
                {"id": 3, "text": "Print business invitation letters", "category": "documents", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Prepare business cards", "category": "documents", "completed": False, "priority": "medium"},
                
                # Booking
                {"id": 5, "text": "Book business-class accommodation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 6, "text": "Arrange airport transfers", "category": "booking", "completed": False, "priority": "medium"},
                {"id": 7, "text": "Book meeting rooms if needed", "category": "booking", "completed": False, "priority": "medium"},
                
                # Work preparation
                {"id": 8, "text": "Prepare presentation materials", "category": "work", "completed": False, "priority": "high"},
                {"id": 9, "text": "Set up international phone/data plan", "category": "communication", "completed": False, "priority": "high"},
                {"id": 10, "text": "Download offline maps and translation apps", "category": "communication", "completed": False, "priority": "medium"},
                {"id": 11, "text": "Pack laptop and work equipment", "category": "packing", "completed": False, "priority": "high"},
                {"id": 12, "text": "Pack formal business attire", "category": "packing", "completed": False, "priority": "high"},
                
                # Finance
                {"id": 13, "text": "Arrange corporate credit card/expense account", "category": "finance", "completed": False, "priority": "high"},
                {"id": 14, "text": "Keep all receipts for expense reports", "category": "finance", "completed": False, "priority": "medium"},
            ],
            
            'adventure': [
                # Gear & Equipment
                {"id": 1, "text": "Pack hiking boots and appropriate footwear", "category": "gear", "completed": False, "priority": "high"},
                {"id": 2, "text": "Pack weather-resistant clothing", "category": "gear", "completed": False, "priority": "high"},
                {"id": 3, "text": "Pack camping/outdoor gear", "category": "gear", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Pack navigation tools (GPS, compass, maps)", "category": "gear", "completed": False, "priority": "high"},
                {"id": 5, "text": "Pack emergency whistle and signal devices", "category": "gear", "completed": False, "priority": "medium"},
                
                # Safety
                {"id": 6, "text": "Check weather conditions and alerts", "category": "safety", "completed": False, "priority": "high"},
                {"id": 7, "text": "Share itinerary with emergency contact", "category": "safety", "completed": False, "priority": "high"},
                {"id": 8, "text": "Pack comprehensive first aid kit", "category": "safety", "completed": False, "priority": "high"},
                {"id": 9, "text": "Research local emergency services", "category": "safety", "completed": False, "priority": "medium"},
                
                # Health
                {"id": 10, "text": "Get travel health insurance", "category": "health", "completed": False, "priority": "high"},
                {"id": 11, "text": "Pack water purification tablets/filter", "category": "health", "completed": False, "priority": "medium"},
                {"id": 12, "text": "Pack high-energy snacks and food", "category": "health", "completed": False, "priority": "medium"},
                
                # Permits & Bookings
                {"id": 13, "text": "Obtain necessary permits/licenses", "category": "permits", "completed": False, "priority": "high"},
                {"id": 14, "text": "Book guided tours or equipment rentals", "category": "booking", "completed": False, "priority": "medium"},
            ],
            
            'family': [
                # Family Documentation
                {"id": 1, "text": "Check all family passports", "category": "documents", "completed": False, "priority": "high"},
                {"id": 2, "text": "Prepare consent letters for minors if applicable", "category": "documents", "completed": False, "priority": "high"},
                {"id": 3, "text": "Pack medical records for family members", "category": "documents", "completed": False, "priority": "medium"},
                
                # Family-friendly booking
                {"id": 4, "text": "Book family rooms/connecting rooms", "category": "booking", "completed": False, "priority": "high"},
                {"id": 5, "text": "Research family-friendly activities", "category": "booking", "completed": False, "priority": "medium"},
                {"id": 6, "text": "Book child-friendly transportation options", "category": "booking", "completed": False, "priority": "medium"},
                
                # Kids preparation
                {"id": 7, "text": "Pack entertainment for kids (tablets, books, games)", "category": "kids", "completed": False, "priority": "high"},
                {"id": 8, "text": "Pack extra clothes for children", "category": "kids", "completed": False, "priority": "medium"},
                {"id": 9, "text": "Pack children's medications and comfort items", "category": "kids", "completed": False, "priority": "high"},
                {"id": 10, "text": "Pack snacks and drinks for kids", "category": "kids", "completed": False, "priority": "medium"},
                
                # Safety for families
                {"id": 11, "text": "Prepare ID tags/cards for children", "category": "safety", "completed": False, "priority": "high"},
                {"id": 12, "text": "Research pediatric healthcare at destination", "category": "safety", "completed": False, "priority": "medium"},
            ],
            
            'romantic': [
                # Special planning
                {"id": 1, "text": "Book romantic accommodation (honeymoon suite, etc.)", "category": "booking", "completed": False, "priority": "high"},
                {"id": 2, "text": "Make dinner reservations at romantic restaurants", "category": "booking", "completed": False, "priority": "high"},
                {"id": 3, "text": "Plan special activities or experiences", "category": "booking", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Book couples spa treatments", "category": "booking", "completed": False, "priority": "low"},
                
                # Special items
                {"id": 5, "text": "Pack formal/evening wear", "category": "packing", "completed": False, "priority": "medium"},
                {"id": 6, "text": "Pack special occasion items (jewelry, etc.)", "category": "packing", "completed": False, "priority": "low"},
                {"id": 7, "text": "Prepare surprise gifts or cards", "category": "special", "completed": False, "priority": "low"},
                
                # Photography
                {"id": 8, "text": "Research photogenic locations", "category": "memories", "completed": False, "priority": "medium"},
                {"id": 9, "text": "Consider hiring a photographer for special moments", "category": "memories", "completed": False, "priority": "low"},
            ],
            
            'cultural': [
                # Cultural preparation
                {"id": 1, "text": "Research local customs and etiquette", "category": "culture", "completed": False, "priority": "high"},
                {"id": 2, "text": "Learn basic phrases in local language", "category": "culture", "completed": False, "priority": "medium"},
                {"id": 3, "text": "Research cultural sites and museums", "category": "culture", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Book guided cultural tours", "category": "booking", "completed": False, "priority": "medium"},
                
                # Appropriate items
                {"id": 5, "text": "Pack culturally appropriate clothing", "category": "packing", "completed": False, "priority": "high"},
                {"id": 6, "text": "Research dress codes for religious sites", "category": "culture", "completed": False, "priority": "high"},
                
                # Learning & documentation
                {"id": 7, "text": "Download translation apps", "category": "communication", "completed": False, "priority": "medium"},
                {"id": 8, "text": "Prepare journal for cultural experiences", "category": "memories", "completed": False, "priority": "low"},
            ],
            
            'backpacking': [
                # Gear essentials
                {"id": 1, "text": "Choose appropriate backpack size", "category": "gear", "completed": False, "priority": "high"},
                {"id": 2, "text": "Pack lightweight, quick-dry clothing", "category": "gear", "completed": False, "priority": "high"},
                {"id": 3, "text": "Pack portable charger/power bank", "category": "gear", "completed": False, "priority": "high"},
                {"id": 4, "text": "Pack universal adapter", "category": "gear", "completed": False, "priority": "medium"},
                
                # Budget travel
                {"id": 5, "text": "Research hostels and budget accommodation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 6, "text": "Get travel insurance for extended trips", "category": "documents", "completed": False, "priority": "high"},
                {"id": 7, "text": "Prepare emergency cash in multiple currencies", "category": "finance", "completed": False, "priority": "medium"},
                
                # Health & safety
                {"id": 8, "text": "Pack comprehensive medical kit", "category": "health", "completed": False, "priority": "high"},
                {"id": 9, "text": "Research local health risks and vaccinations", "category": "health", "completed": False, "priority": "high"},
                
                # Communication
                {"id": 10, "text": "Set up regular check-in schedule with family", "category": "communication", "completed": False, "priority": "medium"},
            ],
            
            'luxury': [
                # Premium bookings
                {"id": 1, "text": "Book luxury accommodation with premium amenities", "category": "booking", "completed": False, "priority": "high"},
                {"id": 2, "text": "Arrange private transfers and transportation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 3, "text": "Make reservations at fine dining restaurants", "category": "booking", "completed": False, "priority": "medium"},
                {"id": 4, "text": "Book premium spa and wellness treatments", "category": "booking", "completed": False, "priority": "low"},
                
                # Luxury items
                {"id": 5, "text": "Pack formal evening wear", "category": "packing", "completed": False, "priority": "medium"},
                {"id": 6, "text": "Pack quality accessories and jewelry", "category": "packing", "completed": False, "priority": "low"},
                
                # Concierge services
                {"id": 7, "text": "Arrange concierge services", "category": "services", "completed": False, "priority": "medium"},
                {"id": 8, "text": "Research exclusive experiences and events", "category": "booking", "completed": False, "priority": "medium"},
            ],
            
            'road_trip': [
                # Vehicle preparation
                {"id": 1, "text": "Service vehicle (oil, brakes, tires)", "category": "vehicle", "completed": False, "priority": "high"},
                {"id": 2, "text": "Check spare tire and emergency kit", "category": "vehicle", "completed": False, "priority": "high"},
                {"id": 3, "text": "Plan fuel stops and routes", "category": "planning", "completed": False, "priority": "high"},
                {"id": 4, "text": "Download offline maps", "category": "planning", "completed": False, "priority": "medium"},
                
                # Road trip essentials
                {"id": 5, "text": "Pack car chargers and adapters", "category": "gear", "completed": False, "priority": "medium"},
                {"id": 6, "text": "Prepare road trip snacks and drinks", "category": "food", "completed": False, "priority": "medium"},
                {"id": 7, "text": "Create road trip playlist", "category": "entertainment", "completed": False, "priority": "low"},
                {"id": 8, "text": "Pack games and entertainment", "category": "entertainment", "completed": False, "priority": "low"},
                
                # Safety & emergency
                {"id": 9, "text": "Ensure roadside assistance coverage", "category": "safety", "completed": False, "priority": "high"},
                {"id": 10, "text": "Pack emergency contact information", "category": "safety", "completed": False, "priority": "medium"},
            ],
            
            'group': [
                # Group coordination
                {"id": 1, "text": "Create shared itinerary and group chat", "category": "coordination", "completed": False, "priority": "high"},
                {"id": 2, "text": "Collect everyone's passport/ID information", "category": "coordination", "completed": False, "priority": "high"},
                {"id": 3, "text": "Coordinate group bookings and payments", "category": "coordination", "completed": False, "priority": "high"},
                {"id": 4, "text": "Plan group activities and free time", "category": "coordination", "completed": False, "priority": "medium"},
                
                # Group logistics
                {"id": 5, "text": "Book group accommodation (adjoining rooms)", "category": "booking", "completed": False, "priority": "high"},
                {"id": 6, "text": "Arrange group transportation", "category": "booking", "completed": False, "priority": "high"},
                {"id": 7, "text": "Research group discounts and deals", "category": "finance", "completed": False, "priority": "medium"},
                
                # Emergency planning
                {"id": 8, "text": "Designate group leader/emergency contact", "category": "safety", "completed": False, "priority": "high"},
                {"id": 9, "text": "Share emergency contact information", "category": "safety", "completed": False, "priority": "medium"},
                {"id": 10, "text": "Plan meeting points and procedures", "category": "safety", "completed": False, "priority": "medium"},
            ]
        }
    
    @staticmethod
    def generate_checklist_for_trip(trip_type, duration_days=None, travelers=1, international=False):
        """Generate a personalized checklist based on trip parameters"""
        templates = ChecklistService.get_default_checklist_templates()
        base_checklist = templates.get(trip_type, templates['leisure']).copy()
        
        # Add universal items that apply to all trips
        universal_items = [
            {"id": 1000, "text": "Check weather forecast", "category": "planning", "completed": False, "priority": "medium"},
            {"id": 1001, "text": "Confirm all bookings 24-48 hours before", "category": "confirmation", "completed": False, "priority": "high"},
        ]
        
        # Add duration-specific items
        if duration_days:
            if duration_days > 7:
                universal_items.append({
                    "id": 1002, "text": "Arrange mail hold/forwarding", "category": "home", 
                    "completed": False, "priority": "medium"
                })
            if duration_days > 14:
                universal_items.append({
                    "id": 1003, "text": "Notify employers/schools of extended absence", "category": "planning", 
                    "completed": False, "priority": "high"
                })
        
        # Add international travel items
        if international:
            international_items = [
                {"id": 2000, "text": "Check visa requirements", "category": "documents", "completed": False, "priority": "high"},
                {"id": 2001, "text": "Research currency exchange rates", "category": "finance", "completed": False, "priority": "medium"},
                {"id": 2002, "text": "Check electrical outlet types and adapters", "category": "gear", "completed": False, "priority": "medium"},
            ]
            universal_items.extend(international_items)
        
        # Add group-specific items if multiple travelers
        if travelers > 1 and trip_type != 'group':
            group_items = [
                {"id": 3000, "text": "Coordinate packing lists with travel companions", "category": "coordination", "completed": False, "priority": "low"},
                {"id": 3001, "text": "Plan shared expenses and payment methods", "category": "finance", "completed": False, "priority": "medium"},
            ]
            universal_items.extend(group_items)
        
        # Combine and ensure unique IDs
        final_checklist = base_checklist + universal_items
        
        # Re-number IDs to ensure uniqueness
        for i, item in enumerate(final_checklist):
            item['id'] = i + 1
        
        return final_checklist
    
    @staticmethod
    def get_checklist_categories():
        """Get all possible checklist categories with their display names and icons"""
        return {
            'documents': {'name': 'Documents & Legal', 'icon': '📄', 'color': 'blue'},
            'booking': {'name': 'Bookings & Reservations', 'icon': '🏨', 'color': 'green'},
            'health': {'name': 'Health & Medical', 'icon': '🏥', 'color': 'red'},
            'finance': {'name': 'Money & Finance', 'icon': '💳', 'color': 'yellow'},
            'communication': {'name': 'Communication & Tech', 'icon': '📱', 'color': 'purple'},
            'packing': {'name': 'Packing & Gear', 'icon': '🧳', 'color': 'orange'},
            'home': {'name': 'Home Preparation', 'icon': '🏠', 'color': 'gray'},
            'planning': {'name': 'Planning & Research', 'icon': '📋', 'color': 'indigo'},
            'safety': {'name': 'Safety & Emergency', 'icon': '🚨', 'color': 'red'},
            'gear': {'name': 'Equipment & Gear', 'icon': '🎒', 'color': 'green'},
            'culture': {'name': 'Cultural Preparation', 'icon': '🏛️', 'color': 'purple'},
            'coordination': {'name': 'Group Coordination', 'icon': '👥', 'color': 'blue'},
            'work': {'name': 'Work & Business', 'icon': '💼', 'color': 'gray'},
            'kids': {'name': 'Children & Family', 'icon': '👨‍👩‍👧‍👦', 'color': 'pink'},
            'special': {'name': 'Special Occasions', 'icon': '💖', 'color': 'pink'},
            'memories': {'name': 'Photos & Memories', 'icon': '📸', 'color': 'yellow'},
            'services': {'name': 'Services & Concierge', 'icon': '🛎️', 'color': 'gold'},
            'vehicle': {'name': 'Vehicle & Transportation', 'icon': '🚗', 'color': 'blue'},
            'food': {'name': 'Food & Dining', 'icon': '🍽️', 'color': 'orange'},
            'entertainment': {'name': 'Entertainment', 'icon': '🎵', 'color': 'purple'},
            'confirmation': {'name': 'Confirmations', 'icon': '✅', 'color': 'green'},
            'permits': {'name': 'Permits & Licenses', 'icon': '📜', 'color': 'blue'},
        }