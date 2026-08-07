#!/usr/bin/env python3
"""
Bot de Reddit - Sistema de Notificaciones en Tiempo Real
- Monitorea subreddits en busca de keywords
- Envía notificaciones a Supabase (tabla system_notifications)
- Integración con el AdminDashboard de Tropicaña
"""

import os
import sys
import time
import signal
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

import praw
from dotenv import load_dotenv
from praw.exceptions import RedditAPIException
from prawcore.exceptions import RateLimitExceeded
from supabase import create_client, Client

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot_radar.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class BotRadar:
    """Bot de monitoreo de Reddit que envía notificaciones a Supabase"""
    
    def __init__(self, env_path: str = '../.env'):
        """
        Inicializa el bot de radar
        
        Args:
            env_path: Ruta al archivo .env (relativa desde scripts/)
        """
        # Cargar variables de entorno
        env_file = Path(__file__).parent / env_path
        load_dotenv(env_file)
        
        # Configuración de Reddit
        self.reddit_client_id = os.getenv('REDDIT_CLIENT_ID')
        self.reddit_client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        self.reddit_user = os.getenv('REDDIT_USER')
        self.reddit_pass = os.getenv('REDDIT_PASS')
        self.reddit_user_agent = os.getenv('REDDIT_USER_AGENT', 'BotRadar/1.0 by Tropicana')
        
        # Configuración de Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        # Validar variables requeridas
        self._validate_env()
        
        # Inicializar clientes
        self.reddit = self._init_reddit_client()
        self.supabase = self._init_supabase_client()
        
        # Configuración de monitoreo
        self.subreddits = os.getenv('RADAR_SUBREDDITS', 'mexico,alcohol,licores').split(',')
        self.keywords = os.getenv('RADAR_KEYWORDS', 'tequila,mezcal,licor,bebida,trago').split(',')
        self.check_interval = int(os.getenv('RADAR_CHECK_INTERVAL', '300'))  # 5 minutos por defecto
        
        # Control de estado
        self.running = False
        self.processed_posts = set()
        
        # Manejar señales de cierre
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        logger.info("🤖 BotRadar inicializado correctamente")
    
    def _validate_env(self) -> None:
        """Valida que todas las variables de entorno requeridas estén presentes"""
        required_vars = {
            'REDDIT_CLIENT_ID': self.reddit_client_id,
            'REDDIT_CLIENT_SECRET': self.reddit_client_secret,
            'REDDIT_USER': self.reddit_user,
            'REDDIT_PASS': self.reddit_pass,
            'SUPABASE_URL': self.supabase_url,
            'SUPABASE_SERVICE_ROLE_KEY': self.supabase_key,
        }
        
        missing = [var for var, value in required_vars.items() if not value]
        if missing:
            raise ValueError(f"Faltan variables de entorno requeridas: {', '.join(missing)}")
    
    def _init_reddit_client(self) -> praw.Reddit:
        """
        Inicializa y autentica el cliente de Reddit
        
        Returns:
            Instancia autenticada de PRAW Reddit
            
        Raises:
            Exception: Si la autenticación falla
        """
        try:
            reddit = praw.Reddit(
                client_id=self.reddit_client_id,
                client_secret=self.reddit_client_secret,
                username=self.reddit_user,
                password=self.reddit_pass,
                user_agent=self.reddit_user_agent
            )
            
            # Verificar autenticación
            user = reddit.user.me()
            logger.info(f"✅ Reddit: Autenticado como u/{user.name}")
            return reddit
            
        except Exception as e:
            logger.error(f"❌ Error al autenticar en Reddit: {e}")
            raise
    
    def _init_supabase_client(self) -> Client:
        """
        Inicializa el cliente de Supabase
        
        Returns:
            Cliente de Supabase configurado
            
        Raises:
            Exception: Si la inicialización falla
        """
        try:
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos")
            
            supabase = create_client(self.supabase_url, self.supabase_key)
            logger.info(f"✅ Supabase: Conectado a {self.supabase_url}")
            return supabase
        except Exception as e:
            logger.error(f"❌ Error al conectar con Supabase: {e}")
            raise
    
    def _signal_handler(self, signum, frame) -> None:
        """Maneja señales de cierre graceful"""
        logger.info(f"⚠️ Señal {signum} recibida. Cerrando bot...")
        self.running = False
        sys.exit(0)
    
    def send_notification(self, source: str, title: str, message: str, action_url: Optional[str] = None) -> bool:
        """
        Envía una notificación a Supabase
        
        Args:
            source: Fuente de la notificación (reddit, lead_web, whatsapp, system, order, chat)
            title: Título de la notificación
            message: Mensaje de la notificación
            action_url: URL opcional para redirigir
            
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        try:
            payload = {
                'source': source,
                'title': title,
                'message': message,
                'action_url': action_url,
                'status': 'unread'
            }
            
            response = self.supabase.table('system_notifications').insert(payload).execute()
            
            # Verificar si hay datos en la respuesta
            response_data = getattr(response, 'data', None)
            if response_data:
                logger.info(f"🔔 Notificación enviada: [{source}] {title}")
                return True
            else:
                error_msg = "Error desconocido"
                response_error = getattr(response, 'error', None)
                if response_error:
                    error_msg = str(response_error)
                logger.error(f"❌ Error al enviar notificación: {error_msg}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error al enviar notificación a Supabase: {e}")
            return False
    
    def check_subreddit(self, subreddit_name: str) -> None:
        """
        Monitorea un subreddit en busca de posts que coincidan con las keywords
        
        Args:
            subreddit_name: Nombre del subreddit a monitorear
        """
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            logger.info(f"🔍 Revisando r/{subreddit_name}...")
            
            posts_checked = 0
            matches_found = 0
            
            for submission in subreddit.new(limit=25):
                posts_checked += 1
                
                # Saltar si ya procesamos este post
                if submission.id in self.processed_posts:
                    continue
                
                # Buscar keywords en título y contenido
                title_lower = submission.title.lower()
                body_lower = (submission.selftext or "").lower()
                combined_text = f"{title_lower} {body_lower}"
                
                # Verificar si coincide con alguna keyword
                matched_keywords = [kw for kw in self.keywords if kw.lower() in combined_text]
                
                if matched_keywords:
                    matches_found += 1
                    logger.info(f"🎯 Post encontrado en r/{subreddit_name}: {submission.title[:60]}...")
                    logger.info(f"   Keywords: {', '.join(matched_keywords)}")
                    
                    # Enviar notificación a Supabase
                    notification_title = f"Nuevo post en r/{subreddit_name}"
                    author_name = getattr(submission.author, 'name', 'unknown') if submission.author else 'unknown'
                    notification_message = (
                        f"Post: {submission.title}\n"
                        f"Autor: u/{author_name}\n"
                        f"Keywords: {', '.join(matched_keywords)}\n"
                        f"URL: https://reddit.com{submission.permalink}"
                    )
                    
                    success = self.send_notification(
                        source='reddit',
                        title=notification_title,
                        message=notification_message,
                        action_url=f"https://reddit.com{submission.permalink}"
                    )
                    
                    if success:
                        self.processed_posts.add(submission.id)
                        logger.info(f"✅ Notificación enviada para post {submission.id}")
            
            logger.info(f"📊 r/{subreddit_name}: {posts_checked} posts revisados, {matches_found} coincidencias")
            
        except RateLimitExceeded as e:
            logger.warning(f"⚠️ Rate limit excedido en r/{subreddit_name}: {e}")
            time.sleep(60)  # Esperar 1 minuto antes de continuar
            
        except Exception as e:
            logger.error(f"❌ Error al revisar r/{subreddit_name}: {e}")
    
    def run(self) -> None:
        """Ejecuta el bot en modo continuo"""
        logger.info("🚀 Iniciando BotRadar...")
        logger.info(f"📋 Subreddits: {', '.join(self.subreddits)}")
        logger.info(f"🔑 Keywords: {', '.join(self.keywords)}")
        logger.info(f"⏱️ Intervalo de revisión: {self.check_interval} segundos")
        
        self.running = True
        
        while self.running:
            try:
                logger.info("🔄 Iniciando ciclo de monitoreo...")
                
                for subreddit in self.subreddits:
                    if not self.running:
                        break
                    self.check_subreddit(subreddit.strip())
                
                logger.info(f"😴 Esperando {self.check_interval} segundos hasta la próxima revisión...")
                time.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                logger.info("⚠️ Interrupción por teclado recibida")
                break
            except Exception as e:
                logger.error(f"❌ Error en ciclo principal: {e}", exc_info=True)
                time.sleep(60)  # Esperar 1 minuto antes de reintentar
        
        logger.info("🛑 BotRadar detenido")
    
    def run_once(self) -> None:
        """Ejecuta una sola revisión de todos los subreddits"""
        logger.info("🔍 Ejecutando revisión única...")
        
        for subreddit in self.subreddits:
            self.check_subreddit(subreddit.strip())
        
        logger.info("✅ Revisión completada")


def main():
    """Función principal"""
    try:
        # Inicializar bot
        bot = BotRadar(env_path='../.env')
        
        # Determinar modo de ejecución
        if len(sys.argv) > 1 and sys.argv[1] == '--once':
            # Modo: ejecutar una sola vez
            bot.run_once()
        else:
            # Modo: ejecutar continuamente
            bot.run()
        
    except ValueError as e:
        logger.error(f"❌ Error de configuración: {e}")
        logger.info("💡 Asegúrate de tener un archivo .env con todas las variables requeridas")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error fatal: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()