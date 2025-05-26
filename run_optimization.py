
#!/usr/bin/env python3
"""
DeerFlow Optimization Runner

This script provides a convenient way to run the DeerFlow system optimization
with monitoring and progress tracking.
"""

import asyncio
import aiohttp
import time
import json
import sys
from typing import Dict, Any

class OptimizationRunner:
    """Handles running and monitoring DeerFlow optimization"""
    
    def __init__(self, server_url: str = "http://0.0.0.0:9000"):
        self.server_url = server_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def check_server_health(self) -> bool:
        """Check if DeerFlow server is running and healthy"""
        try:
            async with self.session.get(f"{self.server_url}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    return health_data.get("status") == "ok"
                return False
        except:
            return False
    
    async def validate_optimization_readiness(self) -> Dict[str, Any]:
        """Validate system readiness for optimization"""
        try:
            async with self.session.post(f"{self.server_url}/optimize/validate") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"ready_for_optimization": False, "error": f"HTTP {response.status}"}
        except Exception as e:
            return {"ready_for_optimization": False, "error": str(e)}
    
    async def get_recommendations(self) -> Dict[str, Any]:
        """Get optimization recommendations"""
        try:
            async with self.session.get(f"{self.server_url}/optimize/recommendations") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def apply_quick_wins(self) -> Dict[str, Any]:
        """Apply quick optimization wins"""
        try:
            async with self.session.post(f"{self.server_url}/optimize/quick-wins") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def start_optimization(self) -> Dict[str, Any]:
        """Start the full optimization process"""
        try:
            async with self.session.post(f"{self.server_url}/optimize/start") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_optimization_status(self) -> Dict[str, Any]:
        """Get current optimization status"""
        try:
            async with self.session.get(f"{self.server_url}/optimize/status") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def monitor_optimization(self, check_interval: int = 30):
        """Monitor optimization progress with real-time updates"""
        
        print("📊 Monitoring optimization progress...")
        print("=" * 50)
        
        last_progress = -1
        
        while True:
            try:
                status_data = await self.get_optimization_status()
                
                if "error" in status_data:
                    print(f"❌ Error getting status: {status_data['error']}")
                    break
                
                optimization_status = status_data.get("optimization_status", {})
                current_progress = optimization_status.get("progress_percentage", 0)
                
                # Only print updates when progress changes
                if current_progress != last_progress:
                    current_phase = optimization_status.get("current_phase", "unknown")
                    completed_tasks = optimization_status.get("completed_tasks", 0)
                    total_tasks = optimization_status.get("total_tasks", 0)
                    active_task = optimization_status.get("active_task", "None")
                    
                    print(f"\n⏰ {time.strftime('%H:%M:%S')} - Progress Update:")
                    print(f"   📈 Progress: {current_progress:.1f}%")
                    print(f"   🎯 Phase: {current_phase}")
                    print(f"   ✅ Completed: {completed_tasks}/{total_tasks} tasks")
                    print(f"   🔧 Active: {active_task}")
                    
                    # Progress bar
                    bar_length = 30
                    filled_length = int(bar_length * current_progress / 100)
                    bar = "█" * filled_length + "░" * (bar_length - filled_length)
                    print(f"   [{bar}] {current_progress:.1f}%")
                    
                    last_progress = current_progress
                
                # Check if optimization is complete
                if current_progress >= 100:
                    print("\n🎉 Optimization completed successfully!")
                    break
                
                await asyncio.sleep(check_interval)
                
            except KeyboardInterrupt:
                print("\n⏹️ Monitoring stopped by user")
                break
            except Exception as e:
                print(f"❌ Monitoring error: {e}")
                await asyncio.sleep(check_interval)

async def run_interactive_optimization():
    """Run interactive optimization with user choices"""
    
    print("🚀 DeerFlow System Optimization Runner")
    print("=" * 40)
    
    async with OptimizationRunner() as runner:
        
        # Step 1: Check server health
        print("1. Checking DeerFlow server health...")
        if not await runner.check_server_health():
            print("❌ DeerFlow server is not running or unhealthy")
            print("Please start the server first: python deerflow_service/server.py")
            return
        print("✅ DeerFlow server is healthy")
        
        # Step 2: Validate readiness
        print("\n2. Validating optimization readiness...")
        readiness = await runner.validate_optimization_readiness()
        
        if not readiness.get("ready_for_optimization", False):
            print("⚠️ System is not ready for optimization")
            print(f"Readiness score: {readiness.get('readiness_score', 0):.2f}")
            print("Issues found:")
            for dep, status in readiness.get("dependencies", {}).items():
                status_icon = "✅" if status else "❌"
                print(f"   {status_icon} {dep}")
            
            print("\nRecommendations:")
            for rec in readiness.get("recommendations", []):
                print(f"   • {rec}")
            
            choice = input("\nContinue anyway? (y/N): ").strip().lower()
            if choice != 'y':
                return
        else:
            print("✅ System is ready for optimization")
        
        # Step 3: Show recommendations
        print("\n3. Getting optimization recommendations...")
        recommendations = await runner.get_recommendations()
        
        if "error" not in recommendations:
            print("📋 Optimization Recommendations:")
            
            high_priority = recommendations.get("high_priority", [])
            if high_priority:
                print("\n🔴 High Priority:")
                for rec in high_priority:
                    print(f"   • {rec.get('title', 'Unknown')}")
                    print(f"     {rec.get('description', '')}")
                    print(f"     Impact: {rec.get('estimated_impact', 'Unknown')}")
            
            medium_priority = recommendations.get("medium_priority", [])
            if medium_priority:
                print("\n🟡 Medium Priority:")
                for rec in medium_priority:
                    print(f"   • {rec.get('title', 'Unknown')}")
                    print(f"     Impact: {rec.get('estimated_impact', 'Unknown')}")
        
        # Step 4: User choice
        print("\n4. Choose optimization approach:")
        print("   1. Apply quick wins only (immediate, low risk)")
        print("   2. Run full optimization (comprehensive, 4-6 hours)")
        print("   3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            print("\n🏃‍♂️ Applying quick optimization wins...")
            result = await runner.apply_quick_wins()
            
            if "error" not in result:
                print("✅ Quick wins applied successfully!")
                print("Optimizations applied:")
                for opt in result.get("optimizations_applied", []):
                    print(f"   • {opt}")
                
                print("\nImmediate benefits:")
                for benefit in result.get("immediate_benefits", []):
                    print(f"   • {benefit}")
                
                improvement = result.get("estimated_improvement", "Unknown")
                print(f"\nEstimated improvement: {improvement}")
            else:
                print(f"❌ Quick wins failed: {result['error']}")
        
        elif choice == "2":
            print("\n🚀 Starting full system optimization...")
            
            # Confirm with user
            print("⚠️ This will run a comprehensive optimization that takes 4-6 hours")
            confirm = input("Are you sure you want to continue? (y/N): ").strip().lower()
            
            if confirm != 'y':
                print("Optimization cancelled")
                return
            
            # Start optimization
            start_result = await runner.start_optimization()
            
            if "error" not in start_result:
                print("✅ Optimization started successfully!")
                print(f"Status: {start_result.get('status', 'unknown')}")
                print(f"Estimated duration: {start_result.get('estimated_duration', 'unknown')}")
                
                # Ask if user wants to monitor
                monitor = input("\nMonitor progress in real-time? (Y/n): ").strip().lower()
                if monitor != 'n':
                    await runner.monitor_optimization()
                else:
                    print("You can check progress later with: GET /optimize/status")
            else:
                print(f"❌ Failed to start optimization: {start_result['error']}")
        
        elif choice == "3":
            print("👋 Goodbye!")
        
        else:
            print("❌ Invalid choice")

async def run_automated_optimization():
    """Run automated optimization without user interaction"""
    
    print("🤖 Running automated DeerFlow optimization")
    
    async with OptimizationRunner() as runner:
        
        # Check health
        if not await runner.check_server_health():
            print("❌ Server not healthy")
            return False
        
        # Apply quick wins first
        print("🏃‍♂️ Applying quick wins...")
        quick_result = await runner.apply_quick_wins()
        
        if "error" in quick_result:
            print(f"❌ Quick wins failed: {quick_result['error']}")
            return False
        
        print("✅ Quick wins applied")
        
        # Start full optimization
        print("🚀 Starting full optimization...")
        start_result = await runner.start_optimization()
        
        if "error" in start_result:
            print(f"❌ Optimization start failed: {start_result['error']}")
            return False
        
        print("✅ Full optimization started")
        
        # Monitor until completion
        await runner.monitor_optimization(check_interval=60)  # Check every minute
        
        return True

def main():
    """Main entry point"""
    
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
        
        if mode == "--automated":
            success = asyncio.run(run_automated_optimization())
            sys.exit(0 if success else 1)
        elif mode == "--quick-wins":
            async def quick_wins_only():
                async with OptimizationRunner() as runner:
                    result = await runner.apply_quick_wins()
                    print(json.dumps(result, indent=2))
                    return "error" not in result
            
            success = asyncio.run(quick_wins_only())
            sys.exit(0 if success else 1)
        elif mode == "--status":
            async def status_only():
                async with OptimizationRunner() as runner:
                    result = await runner.get_optimization_status()
                    print(json.dumps(result, indent=2))
                    return "error" not in result
            
            success = asyncio.run(status_only())
            sys.exit(0 if success else 1)
        else:
            print("Unknown mode. Use --automated, --quick-wins, or --status")
            sys.exit(1)
    else:
        # Interactive mode
        asyncio.run(run_interactive_optimization())

if __name__ == "__main__":
    main()
